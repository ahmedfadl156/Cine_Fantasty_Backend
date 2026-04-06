import dotenv from "dotenv";
import Movie from "../models/movie.model.js";

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
    const today = new Date();
    const next60Days = new Date(today);
    next60Days.setDate(today.getDate() + 60);

    const formatDate = (date) => date.toISOString().split("T")[0];

    let currentPage = 1;
    let totalPages = 1;
    const allMovies = [];

    while (currentPage <= totalPages) {
        const params = new URLSearchParams({
            api_key: process.env.TMDB_API_KEY,
            region: "US",
            "primary_release_date.gte": formatDate(today),
            "primary_release_date.lte": formatDate(next60Days),
            page: currentPage.toString(),
            with_release_type: "2|3"
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

        const bulkOperations = allMovies.map(tmdbMovie => {
            const calculatedGamePrice = calculateMoviePrice(tmdbMovie);

            return {
                updateOne: {
                    filter: { tmdbId: tmdbMovie.id },
                    update: {
                        $set: {
                            title: tmdbMovie.title,
                            posterPath: tmdbMovie.poster_path,
                            backdropPath: tmdbMovie.backdrop_path,
                            releaseDate: new Date(tmdbMovie.release_date),
                            popularity: tmdbMovie.popularity, 
                            genres: tmdbMovie.genre_ids, 
                            status: 'UPCOMING'
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
    } else {
        console.log("No new movies found.");
    }

    return allMovies;
};


// الفانكشن المسئولة عن اضافة الارياح بتاعت الافلام لما تتعرض فى السينما
export const syncBoxOfficeRevenues = async () => {
    try {
        // هنجيب الافلام اللى بتتعرض حاليا فى السينما
        const activeMovies = await Movie.find({ status: 'IN_THEATERS' });

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
        }
    } catch (error) {
        console.error('CRITICAL ERROR in Revenue Sync Job:', error.message);
    }
}