import mongoose from "mongoose";

const cardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter a name for the card"]
    },
    code: {
        type: String,
        required: [true, "Please enter a code for the card"],
        unique: true,
        uppercase: true,
        trim: true
    },
    description: {
        type: String,
        required: [true, "Please enter a description for the card"]
    },
    multiplier: {
        type: Number,
        default: 1.0,
    },
    isProtection: {
        type: Boolean,
        default: false
    },
    budgetConstraint: {
        type: Number,
        default: null
    },
    isActive:{
        type: Boolean,
        default: true
    }
})

const Card = mongoose.model("Card" , cardSchema);
export default Card;