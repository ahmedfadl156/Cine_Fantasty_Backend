import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    studioName: {
        type: String,
        required: [true , "Studion Name is required"],
        trim: true,
        unique: true,
        minlength: [3 , "Studio Name must be at least 3 characters"],
        maxlength: [50 , "Studio Name must be less than 50 characters"]
    },
    email: {
        type: String,
        required: [true , "Email is required"],
        validate: [validator.isEmail , "Please provide a valid email"],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [
            function () {
                return !this.googleId && !this.facebookId;
            },
            "Password is required for email registration"
        ],
        minlength: [8 , "Password must be at least 8 characters"],
        select: false
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    facebookId: {
        type: String,
        unique: true,
        sparse: true,
    },
    avatar: {
        type: String,
        default: "/user_logo.jpg"
    },
    cashBalance: {
        type: Number,
        default: 50000000000,
        min: [0 , "Cash balance must be a positive number"]
    },
    netWorth: {
        type: Number,
        default: 50000000000,
        index: true
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    passwordChangedAt: {
        type: Date,
        default: null
    }
}, {timestamps: true , toJSON: { virtuals: true } , toObject: { virtuals: true }});

// هنعمل وقت الحفظ نبعت الفلوس بالدولار
userSchema.virtual("cashBalanceInDollars").get(function() {
    return this.cashBalance / 100;
})

userSchema.virtual("netWorthInDollars").get(function() {
    return this.netWorth / 100;
})

// قبل مانحفظ اليوزر نشفر الباسورد بتاعه
userSchema.pre("save" , async function() {
    if(!this.isModified("password") || !this.password) return;

    this.password = await bcrypt.hash(this.password , 12);
})

userSchema.methods.correctPassword = async function(candidatePassword , userPassword){
    return await bcrypt.compare(candidatePassword , userPassword);
}

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if(this.passwordChangedAt){
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000 , 10);

        return JWTTimestamp < changedTimestamp;
    }
    return false;
}

const User = mongoose.model("User" , userSchema);

export default User;