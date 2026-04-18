import dotenv from "dotenv"
dotenv.config({path: "config/.env"})
import jwt from "jsonwebtoken"
import catchAsync from "../utils/catchAsync.js"
import User from "../models/user.model.js"
import AppError from "../utils/appError.js"
import Season from "../models/seasons.model.js"
import StudioSeason from "../models/studioSeason.model.js"
const signToken = (user) => {
    return jwt.sign({id: user._id , role: user.role} , process.env.JWT_SECRET , {
        expiresIn: process.env.JWT_EXPIRES_IN
    })
} 

const createSendToken = (user , statusCode , res) => {
    const token = signToken(user);

    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    }

    if(process.env.NODE_ENV === "production") cookieOptions.secure = true;

    res.cookie("cineFantasty_Jwt" , token , cookieOptions)

    user.password = undefined;

    res.status(statusCode).json({
        status: "success",
        data: {
            user
        }
    })
}

// الفانكشن المسئولة عن انشاء الحساب
export const signup = catchAsync(async (req , res , next) => {
    const {studioName , email , password} = req.body;

    const newUser = await User.create({
        studioName: req.body.studioName,
        email: req.body.email,
        password: req.body.password,
    });

    const currentSeason = await Season.findOne({ 
        status: { $in: ['PRE_SEASON', 'ACTIVE'] } 
    });

    if (currentSeason) {
        await StudioSeason.create({
            userId: newUser._id,
            seasonId: currentSeason._id,
            cashBalance: currentSeason.startingBudget,
            netWorth: currentSeason.startingBudget
        });
    }

    createSendToken(newUser , 201 , res);
})

// الفانكشن المسئولة عن تسجيل الدخول
export const login = catchAsync(async (req , res , next) => {
    // هنجيب الايميل والباسورد
    const {email , password} = req.body;

    if(!email || !password) {
        return next(new AppError('Please provide email and password' , 400));
    }

    // هندور على اليوزر بالاميل اللى هو باعته لو لقيناه نرجع معاه الباسورد بتاعه عشان نقارنه ونتاكد انه صح
    const user = await User.findOne({email}).select('+password');

    // بنعمل اتشيك ونتاكد ان اليوزر موجود والباسورد نفس الباسورد اللى هو كاتبه
    if(!user || !(await user.correctPassword(password , user.password))) {
        return next(new AppError('Incorrect email or password' , 401));
    }

    user.lastLogin = Date.now();
    await user.save();

    createSendToken(user , 200 , res);
})

// تسجيل خروج اليوزر 
export const logout = (req , res , next) => {
    res.clearCookie("cineFantasty_Jwt" , {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === 'production',
    });

    res.status(200).json({
        status: "success"
    })
}

// جلب معلومات اليوزر الحالى
export const getMe = catchAsync(async (req , res , next) => {
    // بنجيب الايدى بتاع اليوزر
    const userId = req.user._id;
    
    const user = await User.findById(userId);

    if(!user){
        return next(new AppError('User not found' , 404));
    }

    // هنشوف الموسم الحالى النشط
    const currentSeason = await Season.findOne(
        {status: {$in: ["PRE_SEASON" , "ACTIVE"]}}
    );

    let currentStudio = null;

    if(currentSeason){
        currentStudio = await StudioSeason.findOne({
            userId: userId,
            seasonId: currentSeason._id
        });

        if(!currentStudio){
            currentStudio = await StudioSeason.create({
                userId: userId,
                seasonId: currentSeason._id,
                cashBalance: currentSeason.startingBudget,
                netWorth: currentSeason.startingBudget
            });
        }
    }

    res.status(200).json({
        status: "success",
        data: {
            user,
            activeSeason: currentSeason ? {
                seasonId: currentSeason._id,
                seasonName: currentSeason.name,
                startDate: currentSeason.startDate,
                endDate: currentSeason.endDate,
                status: currentSeason.status,
                currentStudio
            } : null,
        }
    })
})

// فانشكن الحماية اللى بنستخدمها قبل اى عملية عشان نتاكد من اليوزر
export const protect = catchAsync(async (req , res , next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } 
    else if (req.cookies.cineFantasty_Jwt) {
        token = req.cookies.cineFantasty_Jwt;
    }

    if(!token) {
        return next(new AppError('You are not logged in! Please log in to get access.' , 401))
    }

    // هنفك التوكن ونبدا نشوف هل التوكن سليم وما انتهاش
    const decoded = jwt.verify(token , process.env.JWT_SECRET);

    // بعدين نجيب اليوزر من التوكن
    const currentUser = await User.findById(decoded.id);

    if(!currentUser) {
        return next(new AppError('The user belonging to this token does no longer exist.' , 401))
    }

    // نشوف هل اليوزر غير الباسورد بعد ما التووكن دا اتعمل
    if(currentUser.changedPasswordAfter(decoded.iat)){
        return next(new AppError('User recently changed password! Please log in again.' , 401))
    }

    req.user = currentUser;
    next();
})

export const restrictTo = (...roles) => {
    return (req , res , next) => {
        if(!roles.includes(req.user.role)){
            return next(new AppError('You do not have permission to perform this action' , 403))
        }

        next();
    }
}