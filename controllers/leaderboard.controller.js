import User from "../models/user.model";
import catchAsync from "../utils/catchAsync";

export const getLeaderboard = catchAsync(async (req , res , next) => {
    const leaderboard = await User.aggregate([
        // نجيب البيانات الضرورية بس
        {
            $project: {
                studioName: 1,
                cashBalance: 1,
                avatar: 1
            }
        },
        // هنجيب الافلام اللى فى الاستدوي بتاع اليوزر
        {
            $lookup: {
                from: "studioassets",
                localField: "_id",
                foreignField: "userId",
                as: "myAssets"
            }
        },
        // هنجيب الافلام اللى فى الستوديو بتاع اليوزر
        {
            $unwind:{
                path: "$myAssets",
                preserveNullAndEmptyArrays: true
            } 
        },
        // هنجيب الداتا بتاعت الفيلم من ال movies
        {
            $lookup: {
                from: "movies",
                localField: "myAssets.movieId",
                foreignField: "_id",
                as: "movieDetails"
            }
        },
        // نفك التفاصيل دى
        {
            $undwind: {
                path: "$movieDetails",
                preserveNullAndEmptyArrays: true
            }
        },
        // بعدين بقا دلوقتى هنبدا نجمع القيم والحسابات والاسعار
        {
            $group: {
                _id: "$_id",
                studioName: {$first: "$studioName"},
                cashBalance: {$first: "$cashBalance"},
                avatar: {$first: "$avatar"},
                totalMoviesRevenue: {
                    $sum: {$ifNull: ["$movieDetails.boxOfficeRevenue", 0]}
                }
            }
        },
        {
            $addFields: {
                calculatedNetWorth: {$add: ["$cashBalance", "$totalMoviesRevenue"]}
            }
        },
        {$sort: {calculatedNetWorth: -1}},
        {$limit: 100},
        {
            $addFields: {
                netWorthInDollars: {$divide: ["$calculatedNetWorth", 100]},
                cashInDollars: {$divide: ["$cashBalance", 100]},
            }
        }
    ]);

    res.status(200).json({
        status: "success",
        results: leaderboard.length,
        data: {
            leaderboard
        }
    })
})