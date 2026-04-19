import Season from "../models/seasons.model.js";
import StudioSeason from "../models/studioSeason.model.js";
import User from "../models/user.model.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const getLeaderboard = catchAsync(async (req , res , next) => {
    // هنجيب السيزون الحالى
    const currentSeason = await Season.findOne({
        status: {$in: ["ACTIVE" , "PRE_SEASON" , "POST_SEASON"]}
    });

    if(!currentSeason){
        return next(new AppError("No active season found" , 404))
    }

    // هنجيب المحافظ بتاعت اللاعبين
    const leaderboard = await StudioSeason.find({seasonId: currentSeason._id})
    .sort({netWorth: -1})
    .limit(100)
    .populate({
        path: "userId",
        select: "studioName avatar"
    })
    
    const formattedLeaderboard = leaderboard.map((studio , index) => {
        return {
            rank: index + 1,
            studioId: studio.userId._id,
            studioName: studio.userId.studioName,
            avatar: studio.userId.avatar,
            netWorthInDollars: studio.netWorth / 100,
            cashInDollars: studio.cashBalance / 100,
        }
    })
    res.status(200).json({
        status: "success",
        results: formattedLeaderboard.length,
        data: {
            seasonName: currentSeason.name,
            leaderboard: formattedLeaderboard,
        }
    })
})