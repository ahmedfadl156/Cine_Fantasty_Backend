import mongoose from "mongoose";
import StudioAsset from "../models/studioAsset.model.js";
import catchAsync from "../utils/catchAsync.js";

export const getMyStudioAssets = catchAsync(async (req , res , next) => {
const userId = req.user._id;

        const dashboardData = await StudioAsset.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(userId) }
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
                    totalInvestedInDollars: stats.totalInvested / 100,
                    totalFilmsOwned: stats.totalFilmsOwned
                },
                dashboard: {
                    inTheaters: dashboardData[0].inTheaters,
                    inProduction: dashboardData[0].inProduction,
                    archivedFilms: dashboardData[0].archivedFilms
                }
            }
        });
})