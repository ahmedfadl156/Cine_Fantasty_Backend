import mongoose, { Schema } from "mongoose";

const studioSeasonSchema = new Schema ({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    seasonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Season",
        required: true
    },
    cashBalance: {
        type: Number,
        required: true
    },
    netWorth: {
        type: Number,
        required: true
    },
    finalRank: {
        type: Number,
        default: null
    }
}, {timestamps: true , toJSON: {virtuals: true} , toObject: {virtuals: true}});


studioSeasonSchema.index({userId: 1, seasonId: 1}, {unique: true})

studioSeasonSchema.virtual('cashBalanceInDollars').get(function () { 
    return this.cashBalance / 100;
})
studioSeasonSchema.virtual('netWorthInDollars').get(function () { 
    return this.netWorth / 100;
})

const StudioSeason = mongoose.model('StudioSeason', studioSeasonSchema);
export default StudioSeason;