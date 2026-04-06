import { calculateMoviePrice, syncUpcomingMovies } from "../services/syncUpcomingMovies.js";
import catchAsync from "../utils/catchAsync.js";


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
