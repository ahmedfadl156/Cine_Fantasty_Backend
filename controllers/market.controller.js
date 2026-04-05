import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";
import Movie from "../models/movie.model";
import StudioAsset from "../models/studioAsset.model";
import User from "../models/user.model";

// الفانكشن المسئولة عن شراء فيلم
export const buyMovie = catchAsync(async(req , res , next) => {
    // هنجيب بيانات الفيلم اللى هيتشرى وبيناتا اليوزر اللى هيشترى الفيلم
    const movieId = req.params.movieId;
    const userId = req.user.id

    // هنعمل سيشن علشان يا كل حاجة تتم يا مفيش حاجة خالص
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // هنجيب الفيلم علشان نشوف موجود ولا لا
        const movie = await Movie.findById(movieId).session(session);
        if(!movie){
            return next(new AppError("No movie found with that ID" , 404))
        }
        if(movie.status !== "UPCOMING"){
            return next(new AppError("This movie is no longer available on the market" , 400))
        }

        // لو الفيلم موجود وتمام هنشوف هل اليوزر شارى الفيلم دا قبل كدا
        const exisitingAsset = await StudioAsset.findOne({userId , movieId}).session(session);

        if(exisitingAsset){
            return next(new AppError("You already have this movie in your assets" , 400))
        }

        // لو ما اشترهوش قبل كدا نشوف هل هو اصلا معاه فلوس تكفى الفيلم دا
        const user = await User.findById(userId).session(session);
        if(user.cashBalance < movie.basePrice){
            throw new AppError("You don't have enough cash to buy this movie" , 400);
        }

        user.cashBalance -= movie.basePrice;
        await user.save({session});

        const newAsset = await StudioAsset.create([{
            userId: user._id,
            movieId: movie._id,
            purchasePrice: movie.basePrice
        }], {session});

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            status: "success",
            message: "Movie successfully added to your studio!",
            data: {
                asset: newAsset[0],
                remainingBalance: user.cashBalance / 100
            }
        })
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return next(error)
    }
})