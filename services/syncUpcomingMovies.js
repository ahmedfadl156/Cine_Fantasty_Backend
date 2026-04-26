import dotenv from "dotenv";
import Movie from "../models/movie.model.js";
import Season from "../models/seasons.model.js";
import redisClient from "../config/redisClient.js";
import StudioAsset from "../models/studioAsset.model.js";
import StudioSeason from "../models/studioSeason.model.js";
import { sanitizeMarketDatabase } from "../controllers/dashboard.controller.js";

dotenv.config({ path: "config/.env" });

const GENRE_WEIGHTS = {
    28: 1.5,
    878: 1.5,
    12: 1.4,
    16: 1.3,
    14: 1.3,
    35: 1.0,
    27: 0.9,
    18: 0.8,
    99: 0.5
};

export const calculateMoviePrice = (movieData) => {
    const MIN_PRICE = 10000000;
    const MAX_PRICE = 300000000;

    const safePopularity = Math.max(1, movieData.popularity ?? 0);
    const popularityTier = Math.log10(safePopularity);

    let calculatedPrice = MIN_PRICE + (popularityTier * 35000000);

    let maxGenreWeight = 1.0;
    if (Array.isArray(movieData.genre_ids) && movieData.genre_ids.length > 0) {
        movieData.genre_ids.forEach((id) => {
            if (GENRE_WEIGHTS[id] && GENRE_WEIGHTS[id] > maxGenreWeight) {
                maxGenreWeight = GENRE_WEIGHTS[id];
            }
        });
    }

    calculatedPrice *= maxGenreWeight;

    const finalPriceInDollars = Math.min(MAX_PRICE, Math.max(MIN_PRICE, calculatedPrice));
    const roundedPriceInDollars = Math.round(finalPriceInDollars / 1000000) * 1000000;

    return roundedPriceInDollars * 100;
};

// دى الفانكشن اللى بتروح تجيب الافلام اللى لسه هتتعرض
export const syncUpcomingMovies = async () => {
    // هنجيب السزون الحالى علشان نجيب الافلام بناء على تاريخه
    const currentSeason = await Season.findOne({
        status: {$in: ["PRE_SEASON", "ACTIVE"]}
    });

    if(!currentSeason){
        console.log("No active or pre-season found. Skipping movie sync.");
        return []; 
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatDate = (date) => new Date(date).toISOString().split("T")[0];    

    const seasonStartDate = new Date(currentSeason.startDate);
    seasonStartDate.setHours(0, 0, 0, 0);

    const endDate = formatDate(currentSeason.endDate);
    const fetchStartDate = formatDate(seasonStartDate > tomorrow ? seasonStartDate : tomorrow);

    let currentPage = 1;
    let totalPages = 1;
    const allMovies = [];

    while (currentPage <= totalPages) {
        const params = new URLSearchParams({
            api_key: process.env.TMDB_API_KEY,
            region: "US",
            "primary_release_date.gte": fetchStartDate,
            "primary_release_date.lte": endDate,
            page: currentPage.toString(),
            with_release_type: "3",
            watch_region: "US",
            without_watch_providers: "8|119|337|350|188|15", 
            without_companies: "178464",
        });

        const response = await fetch(`https://api.themoviedb.org/3/discover/movie?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`Error fetching upcoming movies: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const pageResults = Array.isArray(data.results) ? data.results : [];

        allMovies.push(...pageResults);
        totalPages = data.total_pages || 1;

        if (currentPage >= 5) {
            break;
        }

        currentPage++;
        await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // هنفلتر الفالام هنحوش الافلام اللى ملهاش بوستر ومش معروفة اوى
    const validMovies = allMovies.filter(movie => {
        if(!movie.poster_path) return false;
        if(movie.popularity < 3) return false;
        if(!movie.release_date) return false;

        const releaseDate = new Date(movie.release_date);
        releaseDate.setHours(0, 0, 0, 0);

        if(Number.isNaN(releaseDate.getTime())) return false;
        if(releaseDate <= today) return false;
        return true;
    })

        const bulkOperations = validMovies.map(tmdbMovie => {
            const calculatedGamePrice = calculateMoviePrice(tmdbMovie);

            return {
                updateOne: {
                    filter: { tmdbId: tmdbMovie.id , seasonId: currentSeason._id },
                    update: {
                        $set: {
                            title: tmdbMovie.title,
                            posterPath: tmdbMovie.poster_path,
                            backdropPath: tmdbMovie.backdrop_path,
                            releaseDate: new Date(tmdbMovie.release_date),
                            popularity: tmdbMovie.popularity, 
                            genres: tmdbMovie.genre_ids, 
                            seasonId: currentSeason._id,
                        },
                        $setOnInsert: {
                            status: 'UPCOMING',
                            boxOfficeRevenue: 0
                        },
                        $max: {
                            basePrice: calculatedGamePrice
                        }
                    },
                    upsert: true
                }
            };
        });

    if (bulkOperations.length > 0) {
        const result = await Movie.bulkWrite(bulkOperations);
        console.log(`Sync completed. ${result.upsertedCount} new movies added, ${result.modifiedCount} movies updated.`);
        await sanitizeMarketDatabase();
        if(result.modifiedCount > 0 || result.upsertedCount > 0){
            await redisClient.del(`topMovies:${currentSeason._id}`);
            const upcomingKeys = await redisClient.keys(`upcomingMovies:${currentSeason._id}:*`);
            if(upcomingKeys.length > 0){
                await redisClient.del(upcomingKeys);
            }
        }
    } else {
        console.log("No new movies found.");
    }

    return validMovies;
};

// الفانكشن اللى هتحسب ال net worth للاعيبة وترتبهم
export const calculateAllNetWorth = async (activeSeasons) => {
    try {
        for(const season of activeSeasons){
            const seasonId = season._id;
            const STARTING_NET_WORTH = season.netWorth || 40000000000;
            console.log(`Calculating net worth for season ${seasonId}`);
    
            const userProfits = await StudioAsset.aggregate([
                {
                    $lookup: {
                        from: "movies",
                        localField: "movieId",
                        foreignField: "_id",
                        as: "movieData"
                    }
                },
                {
                    $unwind: "$movieData"
                },
                {
                    $group: {
                        _id: "$userId",
                        totalRevenue: {$sum: {$ifNull: ["$movieData.boxOfficeRevenue", 0]}}
                    }
                }
            ]);
            if(userProfits.length === 0) continue;
    
            const bulkOperations = userProfits.map(player => ({
                updateOne: {
                    filter: {userId: player._id , seasonId: seasonId},
                    update: {
                        $set: {
                            netWorth: STARTING_NET_WORTH + player.totalRevenue
                        }
                    }
                }
            }));
    
            if(bulkOperations.length > 0){
                await StudioSeason.bulkWrite(bulkOperations);
            }
        }
        console.log("All NetWorths updated successfully across all active seasons!");
    } catch (error) {
        console.error('CRITICAL ERROR in NetWorth Recalculation:', error.message);
    }
}


// الفانكشن المسئولة عن اضافة الارياح بتاعت الافلام لما تتعرض فى السينما
export const syncBoxOfficeRevenues = async () => {
    try {
        // هنجيب السيزون اللى احنا هنسحبله الفلوس
        const activeSeasons = await Season.find({
            status: {$in: ["ACTIVE" , "POST_SEASON"]}
        });

        if(activeSeasons.length === 0){
            console.log("No Active or post seaseons found");
            return;
        }

        const seasonIds = activeSeasons.map(season => season._id);
        // هنجيب الافلام اللى بتتعرض حاليا فى السينما
        const activeMovies = await Movie.find({ 
            status: 'IN_THEATERS',
            seasonId: {$in: seasonIds} 
        });

        if(activeMovies.length === 0){
            console.log("No movies currently in the theaters.");
            return;
        }

        const bulkOperations = [];

        for(const movie of activeMovies){
            const response = await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdbId}?api_key=${process.env.TMDB_API_KEY}`);

            if(!response.ok){
                console.log(`Error fetching movie ${movie.tmdbId}`);
                continue;
            }

            const tmdbData = await response.json();

            // هنجيب السعر اللى هو كسبه ونضربه فى 100 علشان نحفظه بالسنت
            const realRevenueInCents = tmdbData.revenue * 100;

            bulkOperations.push({
                updateOne: {
                    filter: {_id: movie._id},
                    update: {
                        $set: {
                            boxOfficeRevenue: realRevenueInCents
                        }
                    }
                }
            });

            await new Promise(resolve => setTimeout(resolve, 250))
        }

        if(bulkOperations.length > 0){
            const result = await Movie.bulkWrite(bulkOperations);
            console.log(`Revenue Sync Complete: ${result.modifiedCount} movies updated with fresh cash!`);
            // بعد مانجيب الارباح هنحسب ال Net Worth لليوزرز
            await calculateAllNetWorth(activeSeasons)
            for(const seasonId of seasonIds){
                await redisClient.del(`topMovies:${seasonId}`)
            }
        }
    } catch (error) {
        console.error('CRITICAL ERROR in Revenue Sync Job:', error.message);
    }
}

// فانكشن هتشتغل كل يوم الساعة 12 فى بداية اليوم وتشوف الافلام اللى التاريخ انها هتتعرض انهاردة علشان تحدث حالتها
export const activateTodaysMovies = async () => {
    try {
        const activeSeason = await Season.findOne({status: "ACTIVE"});

        if(!activeSeason){
            console.log("No active season found.");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result = await Movie.updateMany(
            {
                seasonId: activeSeason._id,
                status: "UPCOMING",
                releaseDate: {$lte: today}
            },
            {
                $set: {status: "IN_THEATERS"}
            }
        );

        if(result.modifiedCount > 0){
            console.log(`${result.modifiedCount} movies activated.`);

            await redisClient.del(`topMovies:${activeSeason._id}`)
            const upcomingKeys = await redisClient.keys(`upcomingMovies:${activeSeason._id}:*`);
            if (upcomingKeys.length > 0) {
                await redisClient.del(upcomingKeys);
            }
        }
    } catch (error) {
        console.error("Activation Error: " , error)
    }
}
