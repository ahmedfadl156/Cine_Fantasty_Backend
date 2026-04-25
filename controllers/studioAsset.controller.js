import mongoose from "mongoose";
import StudioAsset from "../models/studioAsset.model.js";
import StudioSeason from "../models/studioSeason.model.js";
import catchAsync from "../utils/catchAsync.js";
import Season from "../models/seasons.model.js";

export const getMyStudioAssets = catchAsync(async (req , res , next) => {
        const userId = req.user._id;

        // هنعمل هنا حاجة عشان لو حبينا نعمل ان اليوزر يفلتر الاستوديو بتاعه حسب المواسم اللى فاتت وشوف كان عمل فيها ايه
        let targetSeasonId = req.query.seasonId;

        if(!targetSeasonId){
            const currentSeason = await Season.findOne({
                status: {$in: ["ACTIVE" , "PRE_SEASON"]}
            })

            if(!currentSeason){
                return res.status(200).json({
                status: 'success',
                message: 'No active season running.',
                data: { overview: null, dashboard: null }
                });
            }
            targetSeasonId = currentSeason._id;
        }

        const [targetSeason, studioSeason] = await Promise.all([
            Season.findById(targetSeasonId).select("startingBudget"),
            StudioSeason.findOne({
                userId,
                seasonId: targetSeasonId
            }).select("netWorth")
        ]);

        const startingBudget = targetSeason?.startingBudget || 40000000000;
        const netWorth = studioSeason?.netWorth || startingBudget;

        const dashboardData = await StudioAsset.aggregate([
            {
                $match: { 
                    userId: new mongoose.Types.ObjectId(userId),
                    seasonId: new mongoose.Types.ObjectId(targetSeasonId)
                }
            },
            {
                $lookup: {
                    from: 'movies',
                    localField: 'movieId',
                    foreignField: '_id',
                    as: 'movieDetails'
                }
            },
            {
                $unwind: '$movieDetails'
            },
            {
                $facet: {
                    inTheaters: [
                        { $match: { 'movieDetails.status': 'IN_THEATERS' } },
                        {
                            $project: {
                                _id: 1,
                                purchasePriceInDollars: { $divide: ['$purchasePrice', 100] },
                                status: 1,
                                'movieDetails._id': 1,
                                'movieDetails.title': 1,
                                'movieDetails.posterPath': 1,
                                'movieDetails.boxOfficeRevenueInDollars': { $divide: ['$movieDetails.boxOfficeRevenue', 100] },
                                roiPercentage: {
                                    $cond: {
                                        if: { $eq: ['$purchasePrice', 0] },
                                        then: 0,
                                        else: {
                                            $multiply: [
                                                {
                                                    $divide: [
                                                        { $subtract: ['$movieDetails.boxOfficeRevenue', '$purchasePrice'] },
                                                        '$purchasePrice'
                                                    ]
                                                },
                                                100
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                        { $sort: { 'movieDetails.boxOfficeRevenue': -1 } } 
                    ],
                    
                    inProduction: [
                        { $match: { 'movieDetails.status': 'UPCOMING' } },
                        {
                            $project: {
                                _id: 1,
                                purchasePriceInDollars: { $divide: ['$purchasePrice', 100] },
                                status: 1,
                                'movieDetails._id': 1,
                                'movieDetails.title': 1,
                                'movieDetails.posterPath': 1,
                                'movieDetails.releaseDate': 1,
                                daysUntilRelease: {
                                    $dateDiff: {
                                        startDate: new Date(),
                                        endDate: '$movieDetails.releaseDate',
                                        unit: 'day'
                                    }
                                }
                            }
                        },
                        { $sort: { 'movieDetails.releaseDate': 1 } } 
                    ],

                    archivedFilms: [
                        { $match: { 'movieDetails.status': 'FINISHED' } },
                        {
                            $project: {
                                _id: 1,
                                purchasePriceInDollars: { $divide: ['$purchasePrice', 100] },
                                'movieDetails.title': 1,
                                'movieDetails.boxOfficeRevenueInDollars': { $divide: ['$movieDetails.boxOfficeRevenue', 100] },
                                finalProfitOrLoss: {
                                    $divide: [
                                        { $subtract: ['$movieDetails.boxOfficeRevenue', '$purchasePrice'] },
                                        100
                                    ]
                                }
                            }
                        },
                        { $sort: { finalProfitOrLoss: -1 } }
                    ],

                    studioStats: [
                        {
                            $group: {
                                _id: null,
                                totalInvested: { $sum: '$purchasePrice' },
                                totalFilmsOwned: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ]);

        const stats = dashboardData[0].studioStats[0] || { totalInvested: 0, totalFilmsOwned: 0 };

        res.status(200).json({
            status: 'success',
            data: {
                overview: {
                    seasonId: targetSeasonId,
                    totalInvestedInDollars: stats.totalInvested / 100,
                    totalFilmsOwned: stats.totalFilmsOwned,
                    netProfitInDollars: (netWorth - startingBudget) / 100
                },
                dashboard: {
                    inTheaters: dashboardData[0].inTheaters,
                    inProduction: dashboardData[0].inProduction,
                    archivedFilms: dashboardData[0].archivedFilms
                }
            }
        });
})
