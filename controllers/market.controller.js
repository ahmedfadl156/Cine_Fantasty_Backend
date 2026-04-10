import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Movie from "../models/movie.model.js";
import StudioAsset from "../models/studioAsset.model.js";
import User from "../models/user.model.js";

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


// الفانكشن اللى هتجيب الافلام اللى لسه هتتعرض عشان نبعتها للفرونت يعرضها
export const getUpcomingMovies = catchAsync(async (req , res , next) => {
    // هنظبط ال pagination علشان الافلام لو كتير نقسمها
    const page = parseInt(req.query.page , 10) || 1;
    const limit = parseInt(req.query.limit , 10) || 20;
    const skip = (page - 1) * limit;

    const query = {status: "UPCOMING"};
    // هنجيب الافلام اللى لسه هتتعرض بس
    const movies = await Movie.find(query)
    .select("title posterPath backdropPath releaseDate basePrice")
    .sort({releaseDate: 1}).skip(skip).limit(limit);

    // هنحسب عدد الصفحات كلها
    const totalMovies = await Movie.countDocuments(query);
    const totalPages = Math.ceil(totalMovies / limit);

    res.status(200).json({
        status: "success",
        results: movies.length,
        pagination: {
            currentPage: page,
            totalPages,
            totalMovies,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        },
        data: {movies}
    })
})

// هنجيب اعلى 8 افلام هنا ال top علشان نعرضهم فى الصفحة الرئيسية
export const getTopMovies = catchAsync(async (req , res , next) => {
    const movies = await Movie.find().sort({popularity: -1}).limit(8).select("title posterPath backdropPath releaseDate basePrice basePriceInDollars");

    if(!movies){
        return next(new AppError("No movies found" , 404))
    };

    res.status(200).json({
        status: "success",
        results: movies.length,
        data: {
            movies
        }
    })
})


// دى شوية فانكشنز خاصة بالادمن علشان يقدر نستعملها فى الداشبورد
export const updateMovie = catchAsync(async (req , res , next) => {
    const {status} = req.body;
    const movieId = req.params.movieId;
    // نحدث الفيلم هنا
    const updatedMovie = await Movie.findByIdAndUpdate(
        movieId,
        {
            $set: {
                ...(status && {status})
            }
        },
        {returnDocument: "after" , runValidators: true}
    );

    if(!updatedMovie){
        return next(new AppError("No movie found with that ID" , 404))
    }

    res.status(200).json({
        status: "success",
        data: {
            movie: updatedMovie
        }
    })
})

export const deleteMovie = catchAsync(async (req , res , next) => {
    const movieId = req.params.id;

    // هنشوف الفيلم دا حد شاريه ولا لا
    const isPurchased = await StudioAsset.exists({movieId: movieId});

    if(isPurchased){
        return res.status(409).json({
            status: "Fail",
            message: "Can't delete movie because it's purchased by a studio."
        })
    };

    const movie = await Movie.findByIdAndDelete(movieId);

    if(!movie){
        return next(new AppError('No movie found with that ID', 404));
    }

    res.status(204).json({
        status: "Success",
        data: null
    })
})