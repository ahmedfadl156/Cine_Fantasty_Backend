import dotenv from "dotenv";
dotenv.config({path: "config/.env"});
const GENRE_WEIGHTS = {
    28: 1.5,   // Action (غالي)
    878: 1.5,  // Sci-Fi (غالي)
    12: 1.4,   // Adventure (غالي)
    16: 1.3,   // Animation
    14: 1.3,   // Fantasy
    35: 1.0,   // Comedy (متوسط)
    27: 0.9,   // Horror (رخيص بس بيكسب كتير في الحقيقة)
    18: 0.8,   // Drama (رخيص)
    99: 0.5    // Documentary (رخيص جداً)
};
// الالجوريزم اللى هتحسبلنا سعر كل فيلم
const calculateMoviePrice = (movieData) => {
    const MIN_PRICE = 10000000;
    const MAX_PRICE = 300000000;

    const safePopularity = Math.max(1 , movieData.popularity);
    const popularityTier = Math.log10(safePopularity);

    let calculatedPrice = MIN_PRICE + (popularityTier * 35000000);

    let maxGenreWeight = 1.0;
    if(movieData.genre_ids && movieData.genre_ids.length > 0){
        movieData.genre_ids.forEach(id => {
            if(GENRE_WEIGHTS[id] && GENRE_WEIGHTS[id] > maxGenreWeight){
                maxGenreWeight = GENRE_WEIGHTS[id];
            }
        });
    }

    calculatedPrice = calculatedPrice * maxGenreWeight;

    const finalPriceInDollars = Math.min(MAX_PRICE , Math.max(MIN_PRICE , calculatedPrice));
    const roundedPriceInDollars = Math.round(finalPriceInDollars / 1000000) * 1000000;

    return roundedPriceInDollars * 100;
}

export const syncUpcomingMovies = async () => {
    try {
        // هنظبط هنا مواعيد الافلام اللى احنا عايزينها
        const today = new Date();
        const next60Days = new Date(today);
        next60Days.setDate(today.getDate() + 60);

        const formatDate = (date) => date.toISOString().split('T')[0];

        // هنجيب عدد الصفح علشان هيا بترجع 20 فيلم لكل صفحة فا احنا هنلف على كل الصفح ونخزن الافلام فى ال array
        let currentPage = 1;
        let totalPages = 1;
        let allMovies = [];

        while(currentPage <= totalPages){
            const params = new URLSearchParams({
                api_key: process.env.TMDB_API_KEY,
                region: 'US',
                'primary_release_date.gte': formatDate(today),
                'primary_release_date.lte': formatDate(next60Days),
                page: currentPage.toString(),
                with_release_type: '2|3'
            })
        }
    } catch (error) {
        
    }
}