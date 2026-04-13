import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import League from "../models/league.model.js";
import Season from "../models/seasons.model.js";
import StudioSeason from "../models/studioSeason.model.js";

// انشاء الدورى
export const createLeague = catchAsync(async(req , res , next) => {
    const {name , isPublic} = req.body;
    const userId = req.user._id;
    
    if(!name) return next(new AppError("Please provide a name for the league" , 400));

    // هنجيب السيزون الحالى
    const currentSeason = await Season.findOne({
        status: {$in: ["PRE_SEASON" , "ACTIVE"]}
    })

    if(!currentSeason){
        return next(new AppError("There is no active season at the moment. Please wait for the next season to start." , 404));
    }

    // نشوف اليوزر عنده محفظة متسجلة للموسم دا
    const hasStudio = await StudioSeason.exists({userId , seasonId: currentSeason._id})

    if (!hasStudio) {
        return next(new AppError("You must initialize your studio for the current season before creating a league.", 403));
    }

    // هنتاكد ان اليوزر معندوش دوريات تانية اخره 3 دوريات بس
    const userOwnedLeaguesCount = await League.countDocuments({
        ownerId: userId,
        seasonId: currentSeason._id
    });

    if(userOwnedLeaguesCount >= 3){
        return next(new AppError("You have reached the maximum limit. You can only own up to 3 leagues" , 403));
    }

    // لو تمام هننشئ الدورى
    const newLeague = await League.create({
        name: name,
        ownerId: userId,
        isPublic: isPublic,
        seasonId: currentSeason._id
    });

    await newLeague.save();

    res.status(201).json({
        status: "success",
        message: 'League created successfully! Invite your friends using the code.',
        data: {
            league: {
                _id: newLeague._id,
                name: newLeague.name,
                inviteCode: newLeague.inviteCode,
                ownerId: newLeague.ownerId,
                isPublic: newLeague.isPublic,
                memberCount: newLeague.members.length,
                createdAt: newLeague.createdAt
            }
        }
    })
})

// Join
export const joinLeague = catchAsync(async(req , res , next) => {
    const {inviteCode} = req.body;
    const userId = req.user._id;
    
    if(!inviteCode) {
        return next(new AppError("Please provide an invite code" , 400));
    }

    const formattedInviteCode = inviteCode.toUpperCase().trim();

    // نتاكد من ان الدورى لسه موجود
    const targetLeague = await League.findOne({inviteCode: formattedInviteCode});

    if(!targetLeague){
        return next(new AppError("Invalid invite code. Please check and try again" , 404));
    }

    // نشوف هل الموسم اللى فيه الدورى دا لسه شغال ولا خلص خلاص
    if(['POST_SEASON' , 'CLOSED'].includes(targetLeague.seasonId.status)){
        return next(new AppError("You cannot join this league because its season has already ended.", 400));
    }

    const hasStudio = await StudioSeason.exists({userId , seasonId: targetLeague.seasonId});

    if(!hasStudio){
        return next(new AppError("You must initialize your studio for this season before joining.", 403));
    }

    const joinedLeague = await League.findOneAndUpdate(
        {
            _id: targetLeague._id,
            inviteCode: formattedInviteCode,
            members: {$ne: userId},
            'members.99': {$exists: false}
        },
        {
            $addToSet: {members: userId}
        },
        {
            returnDocument: 'after',
            runValidators: true
        }
    );

    if(joinedLeague){
        return res.status(200).json({
            status: "success",
            message: `Successfully joined league ${joinedLeague.name}`,
            data: {
                league: {
                    _id: joinedLeague._id,
                    name: joinedLeague.name,
                    memberCount: joinedLeague.members.length,
                }
            }
        })
    }

    // لو الموضوع متمش نشوف ليه متمش
    if(targetLeague.members.includes(userId)){
        return next(new AppError("You are already a member of this league" , 400));
    }

    if(targetLeague.members.length >= 100){
        return next(new AppError("This league has reached its maximum capacity of 100 members." , 400));
    }

    return next(new AppError("Could not join the league at this time." , 500))
})

// دى الفانكشن المسئولة انها تجيب الدوريات العامة وتعرضها لليوزرز
export const getPublicLeagues = catchAsync(async(req , res , next) => {
    // هنجيب الايدى بتاع اليوزر 
    const userId = req.user._id;

    const currentSeason = await Season.findOne({
        status: {$in: ["PRE_SEASON" , "ACTIVE"]}
    })

    if (!currentSeason) return res.status(200).json({ status: "success", data: { leagues: [] } });

    // هنجهز ال pagination عشان منبعتش كل الداتا مرة واحدة
    const page = parseInt(req.query.page , 10) || 1;
    const limit = parseInt(req.query.limit , 10) || 12;
    const skip = (page - 1) * limit;

    // هنجمع ال leagues اللى هنعرضها لليوزرز
    const publicLeagues = await League.aggregate([
        {
            $match: {
                isPublic: true,
                seasonId: currentSeason._id,
                members: {$ne: userId},
                'members.99': {$exists: false}
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "ownerId",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                ownerName: "$owner.studioName",
                membersCount: {$size: "$members"},
                createdAt: 1
            }
        },
        {$sort: {membersCount: -1 , createdAt: -1}},
        {$skip: skip},
        {$limit: limit}
    ])

    const totalAvailableLeagues = await League.countDocuments({
        isPublic: true,
        members: {$ne: userId},
        "members.99": {$exists: false}
    });

    const totalPages = Math.ceil(totalAvailableLeagues / limit);

    res.status(200).json({
        status: "success",
        results: publicLeagues.length,
        pagination: {
            currentPage: page,
            totalPages,
            totalAvailableLeagues,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        },
        data: {
            leagues: publicLeagues
        }
    })
})

// الفانكشن المسئولة تجيب الدوريات بتاعت اليوزر
export const getMyLeagues = catchAsync(async (req , res , next) => {
    const userId = req.user._id;

    const currentSeason = await Season.findOne({
        status: {$in: ["PRE_SEASON" , "ACTIVE"]}
    })

    if(!currentSeason) return res.status(200).json({ status: "success", data: { leagues: [] } });

    const myLeagues = await League.aggregate([
        {
            $match: {
                members: userId,
                seasonId: currentSeason._id
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "ownerId",
                foreignField: "_id",
                as: "ownerInfo"
            }
        },
        {
            $unwind: "$ownerInfo"
        },
        {
            $project: {
                _id: 1,
                name: 1,
                inviteCode: 1,
                isPublic: 1,
                memberCount: {$size: "$members"},
                ownerName: "$ownerInfo.studioName",
                role: {
                    $cond: {
                        if: {$eq: ["$ownerId" , userId]},
                        then: "OWNER",
                        else: "MEMBER"
                    }
                },
                createdAt: 1
            }
        },
        {$sort: {role: -1 , createdAt: -1}}
    ]);

    res.status(200).json({
            status: 'success',
            results: myLeagues.length,
            data: {
                leagues: myLeagues
            }
    });
})