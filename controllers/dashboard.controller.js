import redisClient from "../config/redisClient.js";
import Movie from "../models/movie.model.js";
import Season from "../models/seasons.model.js";
import StudioAsset from "../models/studioAsset.model.js";
import StudioSeason from "../models/studioSeason.model.js";
import User from "../models/user.model.js";
import catchAsync from "../utils/catchAsync.js";

export const getCommandCenterStats = catchAsync(async (req , res , next) => {
    const currentSeason = await Season.findOne({
        status: {$in: ["ACTIVE" , "PRE_SEASON"]}
    });

    const promises = [];
    // هنضيف عدد اللاعبين فى اللعبة
    promises.push(User.countDocuments({role: 'user'}));

    // هنجيب عدد اللاعبين الجدد فى اخر 7 ايام
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    promises.push(
        User.aggregate([
            {
                $match: {
                    role: "user",
                    createdAt: {$gte: sevenDaysAgo}
                }
            },
            {
                $group: {
                    _id: {$dateToString: {format: "%Y-%m-%d" , date: "$createdAt"}},
                    count: {$sum: 1}
                }
            },
            {
                $sort: {_id: 1}
            }
        ])
    );

    let activeSeasonStats = null;
    let systemAlerts = [];

    if(currentSeason){
        // عدد اللاعبين المشاركين فى الموسم الحاللى
        promises.push(StudioSeason.countDocuments({seasonId: currentSeason._id}))
        // هنا بنجيب اجمالى الفلوس فى الموسم واجمالى اللى الاعبين كسبوه
        promises.push(
            StudioSeason.aggregate([
                {
                    $match: {
                        seasonId: currentSeason._id
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalCashInCirculation: {$sum: "$cashBalance"},
                        totalEconomyNetWorth: {$sum: "$netWorth"}
                    }
                }
            ])
        );

        // هنعمل تنبيه لو الموسم قرب يخلص علشان الادمن ياخد باله
        const daysUntilEnd = Math.ceil((currentSeason.endDate - new Date()) / (1000 * 60 * 60 * 24));

        if(daysUntilEnd <= 3 && daysUntilEnd > 0){
            systemAlerts.push({
                type: "warning",
                message: `Season ${currentSeason.number} is ending in ${daysUntilEnd} day${daysUntilEnd === 1 ? "" : "s"}. Please prepare your inventory.`
            })
        };

        // تنبيه للافلام لو شغالة فى السينما بس لسه الايرادات بتاعتها ما اتحطتش او ما اتحسبتش
        promises.push(
            Movie.countDocuments({
                seasonId: currentSeason._id,
                status: "IN_THEATERS",
                boxOfficeRevenue: 0
            }).then(count => {
                if(count > 0){
                    systemAlerts.push({
                        type: "CRITICAL",
                        message: `${count} movie(s) in ${currentSeason.name} season are in theaters but don't have box office revenue. Please check them.`
                    })
                }
            })
        )
    }

    const results = await Promise.all(promises);

    // نظبط شكل الداتا اللى هتتبعت
    const totalUsers = results[0];
    const newUsersTrend = results[1];

    if(currentSeason){
        const currentSeasonPlayers = results[2];
        const economyData = results[3][0] || {totalCashInCirculation: 0, totalBoxOfficeRevenue: 0};

        activeSeasonStats = {
            seasonName: currentSeason.name,
            status: currentSeason.status,
            participatingPlayers: currentSeasonPlayers,
            econmy:{
                totalCashBalance: economyData.totalCashInCirculation / 100,
                totalNetWorth: economyData.totalEconomyNetWorth / 100
            }
        }
    } else {
        systemAlerts.push({
            type: "info",
            message: "There is no active season at the moment"
        })
    }

    // هنا نبعت الداتا للادمن
    res.status(200).json({
            status: 'success',
            data: {
                overview: {
                    totalUsers,
                    activeSeasonStats
                },
                charts: {
                    newUsersLast7Days: newUsersTrend
                },
                alerts: systemAlerts
            }
        });
})
// فانكشن مسئولة عن انها تنضف افلام معينة من الداتابيز
export const sanitizeMarketDatabase = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const buggyMovies = await Movie.find({
            status: 'UPCOMING',
            releaseDate: { $lt: today }
        });

        if (buggyMovies.length === 0) {
            return res.status(200).json({ 
                status: "success",
                message: "Market is already clean. No buggy movies found." 
            });
        }

        let deletedCount = 0;
        let protectedCount = 0;
        const affectedSeasonIds = new Set(); 

        for (const movie of buggyMovies) {
            affectedSeasonIds.add(movie.seasonId.toString());

            const isOwned = await StudioAsset.exists({ movieId: movie._id });

            if (!isOwned) {
                await Movie.findByIdAndDelete(movie._id);
                deletedCount++;
            } else {
                await Movie.findByIdAndUpdate(movie._id, { status: 'IN_THEATERS' });
                protectedCount++;
            }
        }

        for (const seasonId of affectedSeasonIds) {
            await redisClient.del(`topMovies:${seasonId}`);
            const upcomingKeys = await redisClient.keys(`upcomingMovies:${seasonId}:*`);
            if (upcomingKeys.length > 0) {
                await redisClient.del(upcomingKeys);
            }
        }

        return res.status(200).json({
            status: "success",
            message: "Database cleanup completed safely.",
            details: {
                totalBuggyMoviesFound: buggyMovies.length,
                deletedMovies: deletedCount,
                protectedAndMovedToTheaters: protectedCount
            }
        });

    } catch (error) {
        console.error("Cleanup Error:", error);
        res.status(500).json({ status: "error", message: "Failed to sanitize database." });
    }
};


// دى فانكشن الادمن من خلالها هيحسب الربح لفيلم نزل منصة مش سينما
export const applyStreamingRevenue = catchAsync(async (req , res , next) => {
    const { movieId } = req.params;

    const movie = await Movie.findById(movieId);
    if (!movie) {
        return next(new AppError("No movie found with that ID" , 404))
    }

    // لو الفيلم موجود هنجيب الداتا بتاعت الفيلم دا اللى بناء عليها هنحسب السعر بتاع الربخ
    const response = await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdbId}?api_key=${process.env.TMDB_API_KEY}`);

    if(!response.ok){
        return res.status(500).json({
            status: "fail",
            message: "Failed to fetch TMDB data"
        })
    }

    const tmdbData = await response.json();

    // الالجوريزم اللى هنحسب نباء عليها
    const voteAverage = tmdbData.vote_average || 0;
    const voteCount = tmdbData.vote_count || 0;
    const currentPopularity = tmdbData.popularity || 0;

    if(voteCount < 100){
        return next(new AppError("Not enough votes yet to calculate a fair revenue. Try again in a few days.", 400));
    }

    const qualityScore = Math.max(0.1 , voteAverage / 10);
    const hypeScore = Math.min(2.0 , Math.max(0.5 , currentPopularity / 50));

    let multiplier = 0.5 + (qualityScore * hypeScore * 2.5);

    multiplier = Math.min(4.5 , Math.max(0.3 , multiplier));

    const basePriceInCents = movie.basePrice;
    const estimateRevenueInCents = Math.round(basePriceInCents * multiplier);

    movie.boxOfficeRevenue = estimateRevenueInCents;
    await movie.save();

    res.status(200).json({
        status: "success",
        message: "Streaming revenue calculated fairly and applied successfully.",
        data: {
            movieTitle: movie.title,
            tmdbRating: voteAverage,
            popularity: currentPopularity,
            calculatedMultiplier: multiplier.toFixed(2) + "x",
            basePrice: `$${(basePriceInCents / 100).toLocaleString()}`,
            finalEstimatedRevenue: `$${(estimatedRevenueInCents / 100).toLocaleString()}`
        }
    });
})