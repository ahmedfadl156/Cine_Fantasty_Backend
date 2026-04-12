import mongoose, { mongo } from "mongoose";
import { customAlphabet, nanoid } from "nanoid";

const generateUniqueInviteCode = customAlphabet("23456789ABCDEFGHJKMNPQRSTUVWXYZ", 6); 

const leagueSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minLength: [3 , "League name must be at least 3 characters"],
        maxLength: [30 , "League name must be less than 30 characters"],
    },
    inviteCode: {
        type: String,
        unique: true,
        index: true,
        uppercase: true,
        trim: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true , "Owner ID is required"],
        ref: "User",
        index: true
    },
    members: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        validate: [
            function(val) {
                return val.length <= 100
            },
            "League has reached its maximum capacity of 100 members"
        ]
    },
    isPublic: {
        type: Boolean,
        default: false
    },
}, {timestamps: true , toJSON: { virtuals: true } , toObject: { virtuals: true }});

// هنا هنولد الكود لكل دورى قبل الحفظ
leagueSchema.pre("save" , async function() {
    if(!this.isNew || this.inviteCode) return;

    let isUnique = false;
    let generatedCode = "";

    while(!isUnique) {
        generatedCode = `AF-${generateUniqueInviteCode()}`;

        const existingLeagueCode = await mongoose.models.League.findOne({inviteCode: generatedCode});

        if(!existingLeagueCode){
            isUnique = true;
        }
    }
    
    this.inviteCode = generatedCode;
    
    if(!this.members.includes(this.ownerId)){
        this.members.push(this.ownerId);
    }
})

const League = mongoose.model("League" , leagueSchema);
export default League;