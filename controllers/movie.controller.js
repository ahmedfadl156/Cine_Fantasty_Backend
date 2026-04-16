import dotenv from "dotenv";
dotenv.config({path: "config/.env"})
import Movie from "../models/movie.model.js";
import { calculateMoviePrice, syncUpcomingMovies } from "../services/syncUpcomingMovies.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import NodeCache from "node-cache";
import redisClient from "../config/redisClient.js";

const tmdbCache = new NodeCache({stdTTL: 86400});

// **************** دى فانشكنز خاصه باليوزر هتظهر فى الفرونت ****************
export const testSync = catchAsync(async (req, res, next) => {
    const sampleMovies = await syncUpcomingMovies();
    const movies = Array.isArray(sampleMovies) ? sampleMovies : [];
    
    res.status(200).json({
        status: 'success',
        message: 'Sync successful! Data saved to MongoDB.',
        sample_prices: movies.map(m => ({
            title: m.title,
            popularity: m.popularity,
            calculated_price_dollars: calculateMoviePrice(m) / 100
        }))
    });
});


export const getMovieDetails = catchAsync(async (req , res , next) => {
    // هنجيب الايدى بتاع الفيلم
    const movieId = req.params.id;

    // هنجيب بيانات الفيلم الخاصة باللعبة
    const gameMovieData = await Movie.findById(movieId);

    if(!gameMovieData){
        return next(new AppError("Movie not found" , 404));
    }

    const tmdbId = gameMovieData.tmdbId;
    let externalStats = {};

    // هنشوف الفيلم ليه بيانات فى الكاش متخزنة ولا لا
    if(tmdbCache.has(tmdbId)){
        externalStats = tmdbCache.get(tmdbId);
    }else{
        const url = `https://api.themoviedb.org/3/movie/${tmdbId}?append_to_response=credits&language=en-US`;
        const options = {
            method: 'GET',
            headers: {
            accept: 'application/json',
            Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}` 
            }
        }

        const response = await fetch(url, options);

        if(!response.ok){
            throw new AppError(`Error fetching movie details: ${response.status} ${response.statusText}`, response.status);
        }

        const tmdbJson = await response.json();

        externalStats = {
            tagline: tmdbJson.tagline,
            overview: tmdbJson.overview,
            budgetInDollars: tmdbJson.budget, 
            realLifeRevenue: tmdbJson.revenue, 
            runtime: tmdbJson.runtime, 
            releaseDate: tmdbJson.release_date,
            productionCompanies: tmdbJson.production_companies.map(company => company.name),
            director: tmdbJson.credits?.crew?.find(member => member.job === 'Director')?.name || 'Unknown',
            
            topCast: tmdbJson.credits?.cast?.slice(0, 10).map(actor => ({
                name: actor.name,
                character: actor.character,
                profilePic: actor.profile_path ? `https://image.tmdb.org/t/p/w200${actor.profile_path}` : null
            })) || []
        };

        tmdbCache.set(tmdbId , externalStats);
    }

    res.status(200).json({
        status: 'success',
        data: {
            draftInfo: {
            systemId: gameMovieData._id,
            title: gameMovieData.title,
            gameStatus: gameMovieData.status,
            posterPath: gameMovieData.posterPath,
            purchasePriceInDollars: gameMovieData.basePriceInDollars,
            currentProfitOrLoss: gameMovieData.currentProfitOrLoss,
            },
            movieDetails: externalStats 
        }
    });
})



// ************** دى الفانكشنز الخاصة بالادمن ********************
// دى الفاتكشن اللى هتجيب كل الافلام للادمن
export const getAdminMovies = catchAsync(async(req , res , next) => {
    const query = {};
    // هنظبط ال query عشان لو الاجمن عايز يفلتر او يبحث عن اسم معين
    if(req.query.seasonId) query.seasonId = req.query.seasonId;
    if(req.query.status) query.status = req.query.status;
    if(req.query.search) {
        query.title = {$regex: req.query.search , $options: "i"};
    }

    // هنجهز ال pagination
    const page = parseInt(req.query.page , 10) || 1;
    const limit = parseInt(req.query.limit , 10) || 20;
    const skip = (page - 1) * limit;

    const movies = await Movie.find(query)
    .populate('seasonId' , 'name status')
    .sort({releaseDate: 1})
    .skip(skip).limit(limit);

    const totalMovies = await Movie.countDocuments(query);

    res.status(200).json({
        status: "success",
        results: movies.length,
        pagination:{
            currentPage: page,
            totalPages: Math.ceil(totalMovies / limit),
            totalMovies
        },
        data: { movies }
    })
})

// دى الفانكشن الخاصة عن تعديل الافلام لو احتاجت تعديل او تحديث
export const updateMovieAdmin = catchAsync(async (req , res , next) => {
    const movieId = req.params.id;
    const {status , basePriceInDollars , boxOfficePriceInDollars , releaseDate} = req.body;

    const movie = await Movie.findById(movieId)
    if (!movie) {
        return next(new AppError("No movie found with that ID" , 404))
    }

    // نجهز التحديثات اللى الادمن يعتها
    if(status) movie.status = status;
    if(releaseDate) movie.releaseDate = new Date(releaseDate);
    if(basePriceInDollars !== undefined) movie.basePrice = basePriceInDollars * 100;
    if(boxOfficePriceInDollars !== undefined) movie.boxOfficeRevenue = basePriceInDollars * 100;

    await movie.save();

    // هنمسح الكاش القديم علشان التحديثات تظهر لليوزرز علطول
    const seasonIdStr = movie.seasonId.toString();

    const upcomingKeys = await redisClient.keys(`upcomingMovies:${seasonIdStr}:*`);
    if (upcomingKeys.length > 0) {
        await redisClient.del(upcomingKeys);
    }
    console.log(`[ADMIN] Movie ${movie.title} manually updated. Cache cleared for season ${seasonIdStr}.`);

    res.status(200).json({
        status: 'success',
        message: `Movie ${movie.title} has been manually updated.`,
        data: { movie }
    });
})


// هنا هنعمل زى زرار للادمن لو حب انه يتحكم فى تحديث الافلام من غير ما يستنى ال CRON JOB
export const forceSyncMovies = catchAsync(async (req , res , next) => {
    const resultMovies = await syncUpcomingMovies();

    if(!resultMovies  || resultMovies.length === 0){
        return res.status(200).json({
            status: 'success',
            message: 'Sync executed, but no new updates or active season found.'
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'Manual TMDB sync completed successfully. The market is now up to date!',
        results: resultMovies.length
    });
})