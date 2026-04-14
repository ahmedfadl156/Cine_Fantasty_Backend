import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    seasonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Season",
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ["MOVIE_PURCHASED" , "LEAGUE_JOINED" , "SEASON_STARTED"],
        required: true
    },
    data: {
        movieId: mongoose.Schema.Types.ObjectId,
        movieTitle: String,
        moviePoster: String,
        purchasePrice: Number,
        leagueId: mongoose.Schema.Types.ObjectId,
        leagueName: String,
        studioName: String
    }
} , {timestamps: true})

activityLogSchema.index({userId: 1 , seasonId: 1 , createdAt: -1});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;