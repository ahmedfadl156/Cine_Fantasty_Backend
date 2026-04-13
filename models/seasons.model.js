import mongoose, { Schema } from "mongoose";

const seasonSchema = new Schema({
    name: {
        type: String,
        required: [true , "Season name is required"],
        unique: true,
        trim: true
    },
    startDate: {
        type: Date,
        required: [true , "Season start date is required"]
    },
    endDate: {
        type: Date,
        required: [true , "Season end date is required"]
    },
    status: {
        type: String,
        enum: ["PRE_SEASON" , "ACTIVE" , "POST_SEASON" , "CLOSED"],
        default: "PRE_SEASON"
    },
    startingBudget: {
        type: Number,
        default: 40000000000
    }
}, {timestamps: true})

seasonSchema.index({status: 1});
seasonSchema.index({startData: 1 , endDate: 1});

const Season = mongoose.model("Season" , seasonSchema);
export default Season;