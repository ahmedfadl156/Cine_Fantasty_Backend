import mongoose from "mongoose";

const studioAssetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true , "User ID is required"],
        index: true
    },
    movieId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Movie",
        required: [true , "Movie ID is required"],
        index: true
    },
    seasonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Season",
        required: [true , "Season ID is required"],
        index: true
    },
    purchasePrice: {
        type: Number,
        required: [true , "Purchase Price is required"],
        min: [0 , "Purchase Price must be a positive number"]
    },
    status: {
        type: String,
        enum: ["ACTIVE" , "SOLD" , "ARCHIVED"],
        default: "ACTIVE"
    },
    appliedCard: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Card",
        default: null
    }
}, {timestamps: true , toJSON: { virtuals: true } , toObject: { virtuals: true }});

studioAssetSchema.index({userId: 1 , movieId: 1 , seasonId: 1} , {unique: true});

studioAssetSchema.virtual("purchasePriceInDollars").get(function() {
    return this.purchasePrice / 100;
})

const StudioAsset = mongoose.model("StudioAsset" , studioAssetSchema);
export default StudioAsset;