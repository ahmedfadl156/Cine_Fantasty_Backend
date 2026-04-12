import dotenv from "dotenv";
dotenv.config({path: "config/.env"})
import Movie from "../models/movie.model.js";
import { calculateMoviePrice, syncUpcomingMovies } from "../services/syncUpcomingMovies.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import NodeCache from "node-cache";

const tmdbCache = new NodeCache({stdTTL: 86400});

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