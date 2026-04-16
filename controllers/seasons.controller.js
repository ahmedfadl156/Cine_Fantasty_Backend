import mongoose from "mongoose";
import Season from "../models/seasons.model.js";
import catchAsync from "../utils/catchAsync.js";
import StudioSeason from "../models/studioSeason.model.js";
import Movie from "../models/movie.model.js";
import AppError from "../utils/appError.js";
import League from "../models/league.model.js";






// **************** كل الفانكشنز دى خاصة بالادمن ************************************

// انشاء سيزون جديد
export const createSeason = catchAsync(async (req , res , next) => {
    const {name , startDate , endDate , startingBudget} = req.body;

    if(!name || !startDate || !endDate){
        return next(new AppError("Name, start date and end date are required" , 400))
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if(start >= end){
        return next(new AppError("Start date must be before end date" , 400))
    }

    const activeSeason = await Season.findOne({
        status: {$in: ["ACTIVE" , "PRE_SEASON"]}
    });

    if(activeSeason){
        return next(new AppError(`Cannot create a new season. '${activeSeason.name}' is currently running. Please close it first.`, 400));
    }

    const overlappingSeason = await Season.findOne({
        $or: [
            {startDate: {$lte: end} , endDate: {$gte: start}}
        ]
    });

    if(overlappingSeason){
        return next(new AppError(`The dates overlap with an existing season: ${overlappingSeason.name}`, 400));
    }

    const newSeason = await Season.create({
        name,
        startDate: start,
        endDate: end,
        startingBudget: startingBudget || 40000000000
    })

    res.status(201).json({
        status: "success",
        message: 'Season created successfully. It is now in PRE_SEASON state.',
        data: {
            season: newSeason
        }
    })
})

// تحديث حالة السيزون
export const updateSeasonStatus = catchAsync(async (req , res , next) => {
    const {status} = req.body;
    const seasonId = req.params.id;

    const validStatus = ['PRE_SEASON' , 'ACTIVE' , 'POST_SEASON' , 'CLOSED'];

    if(!validStatus.includes(status)){
        return next(new AppError(`Invalid status provided` , 400))
    }

    const season = await Season.findById(seasonId);

    if(!season){
        return next(new AppError("Season not found" , 404))
    }

    if(season.status === "CLOSED"){
        return next(new AppError("Cannot update a closed season" , 400))
    }

    if(status === "CLOSED" && season.status !== "CLOSED"){
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            season.status = "CLOSED";
            await season.save({session});

            const allStudios = await StudioSeason.find({seasonId: season.id})
            .sort({netWorth: -1})
            .session(session);

            const bulkRankUpdates = allStudios.map((studio, index) => ({
                updateOne: {
                    filter: { _id: studio._id },
                    update: { $set: { finalRank: index + 1 } }
                }
            }));

            if(bulkRankUpdates.length > 0){
                await StudioSeason.bulkWrite(bulkRankUpdates , {session});
            }

            await session.commitTransaction();
            session.endSession();

            return res.status(200).json({
                status: 'success',
                message: `Season ${season.name} is now OFFICIALLY CLOSED. Final ranks have been calculated for ${allStudios.length} players.`,
                data: { season }
            });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            return next(new AppError("Error occurred while closing the season", 500));
        }
    }

    season.status = status;
    await season.save();

    res.status(200).json({
        status: 'success',
        message: `Season status updated to ${status}.`,
        data: { season }
    });
})

// تحديث تفاصيل ومعلومات السيزون
export const updateSeasonDetails = catchAsync(async (req , res , next) => {
    const {name , startDate , endDate , startingBudget} = req.body;
    const seasonId = req.params.id;

    const season = await Season.findById(seasonId);
    if(!season){
        return next(new AppError('Season not found' , 404));
    }

    // هنمنع ان الادمن يعدل الميزانية لو السيزون بدا او لو هو خلصان اصلا
    if(["ACTIVE" , "POST_SEASON" , "CLOSED"].includes(season.status) && startingBudget){
        return next(new AppError('Cannot update starting budget after the season has started.', 400));
    }

    // هنا نتاكد ان التواريخ مظبوطة
    if(startDate && endDate){
        if(new Date(startDate) > new Date(endDate)){
            return next(new AppError('End date must be after the start date.', 400));
        }
    }

    const updatedSeason = await Season.findByIdAndUpdate(
        seasonId,
        {
            name: name || season.name,
            startDate: startDate || season.startDate,
            endDate: endDate || season.endDate,
            startingBudget: startingBudget || season.startingBudget,
        },
        {returnDocument: "after" , runValidators: true}
    );

    res.status(200).json({
        status: "Success",
        message: "Season details updated successfully",
        data: {
            season: updatedSeason
        }
    })
})

// هنا هنجيب معلومات السيزون الكاملة علشان نعرضها للادمن
export const getAdminSeasonDetails = catchAsync(async(req , res , next) => { 
    const seasonId = req.params.id;

    if(!mongoose.Types.ObjectId.isValid(seasonId)){
        return next(new AppError("Invalid Season Id" , 400));
    }

    const season = await Season.findById(seasonId);
    if(!season){
        return next(new AppError("Season not found" , 404));
    }

    // هنعمل aggregation يجمعلنا كل المعلومات عن الموسم مرة واحدة
    const [studioStats , movieStats] = await Promise.all([
        StudioSeason.aggregate([
            {
                $match: {
                    seasonId: season._id,
                }
            },
            {
                $group: {
                    _id: null,
                    totalPlayers: {$sum: 1},
                    totalEconomyNetWorth: {$sum: "$netWorth"},
                    totalCashInMarket: {$sum: "$cashBalance"},
                }
            }
        ]),
        Movie.countDocuments({seasonId: season._id})
    ]);

    const economyData = studioStats[0] || {totalPlayers: 0 , totalEconomyNetWorth: 0 , totalCashInMarket: 0};

    res.status(200).json({
        status: 'success',
        data: {
            season,
            analytics: {
                totalPlayers: economyData.totalPlayers,
                totalMovies: movieStats,
                economy: {
                    totalNetWorthInDollars: economyData.totalEconomyNetWorth / 100,
                    totalAvailableCashInDollars: economyData.totalCashInMarket / 100
                }
            }
        }
    });
})

// حذف سيزون
export const deleteSeason = catchAsync(async (req , res , next) => {
    const seasonId = req.params.id;

    if(!mongoose.Types.ObjectId.isValid(seasonId)){
        return next(new AppError("Invalid Season Id" , 400));
    }

    const season = await Season.findById(seasonId);
    if(!season){
        return next(new AppError("Season not found" , 404));
    }

    const hasStudios = await StudioSeason.exists({seasonId: season._id});
    const hasLeagues = await League.exists({seasonId: season._id}); 
    const hasMovies = await Movie.exists({seasonId: season._id});

    if(hasStudios || hasLeagues || hasMovies){
        return next(new AppError("Season already has content. You can't delete it." , 400));
    }

    await Season.findByIdAndDelete(seasonId);

    res.status(204).json({
        status: "Success",
        data: null
    })
})