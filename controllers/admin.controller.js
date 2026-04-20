import mongoose from "mongoose";
import StudioSeason from "../models/studioSeason.model.js";
import User from "../models/user.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import AuditLog from "../models/auditLog.model.js";
import Season from "../models/seasons.model.js";

// الكنتيرولر المسئولة عن انها تجيب كل اللاعيبة للادمن
export const getAllUsers = catchAsync(async (req , res , next) => {
    // نجهز ال pagination , search
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const searchQuery = {};
    if(req.query.search){
        searchQuery.$or = [
            {studioName: {$regex: req.query.search , $options: "i"}},
            {email: {$regex: req.query.search , $options: "i"}},
        ]
    };

    if(req.query.status){
        searchQuery.accountStatus = req.query.status;
    }

    const users = await User.find(searchQuery)
    .select("studioName email accountStatus createdAt")
    .limit(limit)
    .skip(skip)
    .sort({createdAt: -1})
    .lean();

    const totalUsers = await User.countDocuments(searchQuery);

    res.status(200).json({
        status: "success",
        results: users.length,
        data: {
            users,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: page,
            hasNextPage: skip + limit < totalUsers,
            hasPreviousPage: page > 1,
        }
    });
})

// هنا مسئولة انها تجيب بروفايل لاعب كامل لما اليوزر يضغط عليه تجيب كل بياناته
export const getUserPortfolio = catchAsync(async (req , res , next) => {
    const currentSeason = await Season.findOne({
        status: {$in: ["ACTIVE" , "PRE_SEASON" , "POST_SEASON"]}
    });

    if(!currentSeason){
        return next(new AppError("There is no active season" , 404));
    }
    const seasonId = currentSeason._id;
    const {userId} = req.params;

    const portfolioData = await StudioSeason.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                seasonId: new mongoose.Types.ObjectId(seasonId)
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userData"
            }
        },
        {
            $unwind: "$userData"
        },
        {
            $lookup:{
                from: "studioassets",
                let: {targetUserId: "$userId" , targetSeasonId: "$seasonId"},
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    {$eq: ["$userId" , "$$targetUserId"]},
                                    {$eq: ["$seasonId" , "$$targetSeasonId"]}
                                ]
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: "movies",
                            localField: "movieId",
                            foreignField: "_id",
                            as: "movieDetails"
                        }
                    },
                    {
                        $unwind: '$movieDetails'
                    },
                    {
                        $project: {
                            _id: 1,
                            purchasePriceInDollars: {$divide: ["$purchasePrice", 100]},
                            status: 1,
                            createdAt: 1,
                            "movieTitle": "$movieDetails.title",
                            "moviePoster": "$movieDetails.posterPath",
                            "boxOfficeRevenue": "$movieDetails.boxOfficeRevenue",
                            "movieStatus": "$movieDetails.status"
                            }
                    }
                ],
                as: "ownedMovies"
            }
        },
        {
            $project:{
                _id: 1,
                cashBalance: 1,
                netWorth: 1,
                rank: 1,
                userName: "$userData.studioName",
                userEmail: "$userData.email",
                accountStatus: "$userData.accountStatus",
                moviesCount: {$size: "$ownedMovies"},
                ownedMovies: 1
            }
        }
    ]);

    if(!portfolioData || portfolioData.length === 0){
        return next(new AppError("No portfolio found for this user in this season" , 404))
    }

    res.status(200).json({
        status: 'success',
        data: {
            portfolio: portfolioData[0]
        }
    });
})

// هنا لو الادمن عايز يغر حالة لاعب يديله بان يوقفه شوية او هكذا
export const changeUserStatus = catchAsync(async (req , res , next) => {
    const {userId} = req.params;
    const {status , reason} = req.body;

    if(!["ACTIVE" , "SUSPENDED" , "BANNED"].includes(status)){
        return next(new AppError('Invalid status' , 400));
    };

    if(!reason){
        return next(new AppError('You must provide a reason for this status change' , 400));
    };

    const user = await User.findByIdAndUpdate(
        userId,
        {
            accountStatus: status,
        },
        {
            returnDocument: 'after',
            runValidators: true,
        }
    );

    if(!user){
        return next(new AppError('No user found with that ID' , 404));
    };

    await AuditLog.create({
        adminId: req.user._id,
        targetUserId: userId,
        actionType: 'STATUS_CHANGE',
        reason: `Status changed to ${status}. Reason: ${reason}`
    });

    res.status(200).json({
        status: 'success',
        message: `User status updated to ${status}`,
        data: {
            accountStatus: user.accountStatus
        }
    });
})

// دى فانكشن مسئولة لو عايزين نعوض يوزر فى فلوس لاى سبب حصل مفاجئ
export const compensateUser = catchAsync(async (req , res , next) => {
    const {userId , seasonId} = req.params;
    const {amountInDollars , reason} = req.body;

    if(!amountInDollars || !reason){
        return next(new AppError("Please provide amount and reason" , 400));
    }

    const amountInCents = amountInDollars * 100;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const studio = await StudioSeason.findOne({userId , seasonId}).session(session);

        if(!studio){
            return next(new AppError("Studio not found" , 404));
        }

        studio.cashBalance += amountInCents;
        studio.netWorth += amountInCents;
        await studio.save({session});

        await AuditLog.create([{
            adminId: req.user._id,
            targetUserId: userId,
            actionType: amountInCents > 0 ? 'COMPENSATE_CASH' : 'DEDUCT_CASH',
            amountInCents: amountInCents,
            reason: reason
        }], {session});

        await session.commitTransaction(); 
        session.endSession();

        res.status(200).json({
            status: 'success',
            message: `${amountInDollars}$ has been ${amountInCents > 0 ? 'added to' : 'deducted from'} the user's account.`,
            data: {
                newAvailableCash: studio.cashBalance,
                newNetWorth: studio.netWorth
            }
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
})