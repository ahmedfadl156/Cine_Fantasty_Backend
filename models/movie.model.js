import mongoose from "mongoose";

const movieSchema = new mongoose.Schema({
    tmdbId: {
        type: Number,
        required: [true , "TMDB ID is required"],
        index: true
    },
    seasonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Season",
        required: [true , "Season ID is required"],
        index: true
    },
    title: {
        type: String,
        required: [true , "Title is required"],
        trim: true
    },
    posterPath: {
        type: String,
        default: null
    },
    backdropPath: {
        type: String,
        default: null
    },
    genres: [
        {
            type: String
        }
    ],
    releaseDate: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ["UPCOMING" , "IN_THEATERS" , "FINISHED"],
        default: "UPCOMING",
        index: true
    },
    basePrice: {
        type: Number,
        required: [true, "Please provide a base price for the movie"],
        min: [0, "Base price must be a positive number"]
    },
    boxOfficeRevenue: {
        type: Number,
        default: 0,
        min: [0, "Box office revenue must be a positive number"]
    },
    popularity: {
        type: Number,
        default: 0,
    }
}, {timestamps: true , toJSON: { virtuals: true } , toObject: { virtuals: true }});

movieSchema.index({tmdbId: 1 , seasonId: 1} , {unique: true})

// هنعمل كومباوند يجيب الافلام الجاية وتبقى مترتبة بتاريخ النزول
movieSchema.index({ seasonId: 1, status: 1, releaseDate: 1 });

movieSchema.virtual("basePriceInDollars").get(function() {
    return this.basePrice / 100;
})

movieSchema.virtual("boxOfficeRevenueInDollars").get(function() {
    return this.boxOfficeRevenue / 100;
})

// هنا عشام لو جيت اعرض الفيلم كسبان ولا خشران لحد دلقوتى
movieSchema.virtual("currentProfitOrLoss").get(function () {
    return (this.boxOfficeRevenue - this.basePrice) / 100;
})

const Movie = mongoose.model("Movie", movieSchema);
export default Movie;