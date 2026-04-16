import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Movie from "../models/movie.model.js";
import StudioAsset from "../models/studioAsset.model.js";
import User from "../models/user.model.js";
import Season from "../models/seasons.model.js";
import StudioSeason from "../models/studioSeason.model.js";
import ActivityLog from "../models/ActivityLog.model.js";
import redisClient from "../config/redisClient.js";

// الفانكشن المسئولة عن شراء فيلم
export const buyMovie = catchAsync(async(req , res , next) => {
    // هنجيب بيانات الفيلم اللى هيتشرى وبيناتا اليوزر اللى هيشترى الفيلم
    const movieId = req.params.movieId;
    const userId = req.user.id

    // هنعمل سيشن علشان يا كل حاجة تتم يا مفيش حاجة خالص
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // نجيب الموسم الحالى
        const currentSeason = await Season.findOne({
            status: {$in: ["ACTIVE" , "PRE_SEASON"]}
        }).session(session);

        if(!currentSeason){
            return next(new AppError('The market is currently closed as there is no active season.' , 404));
        }
        // هنجيب الفيلم علشان نشوف موجود ولا لا
        const movie = await Movie.findOne({
            _id: movieId,
            seasonId: currentSeason._id
        }).session(session);

        if(!movie){
            return next(new AppError("No movie found with that ID" , 404))
        }
        if(movie.status !== "UPCOMING" ){
            return next(new AppError("This movie is no longer available for purchase." , 400))
        }

        if(movie.status === "UPCOMING" && new Date(movie.releaseDate).toDateString() <= new Date().toDateString()){
            return next(new AppError("This movie is no longer available for purchase." , 400))
        }

        // لو الفيلم موجود وتمام هنشوف هل اليوزر شارى الفيلم دا قبل كدا
        const exisitingAsset = await StudioAsset.findOne({userId , movieId}).session(session);

        if(exisitingAsset){
            return next(new AppError("You already have this movie in your assets" , 400))
        }

        // هنجيب المحفظ بتاعت اليوزر فى السيزون دا
        const studioSeason = await StudioSeason.findOne({
            userId,
            seasonId: currentSeason._id
        }).session(session);

        if(!studioSeason){
            return next(new AppError("Your studio account for this season is not initialized." , 400));
        }

        if(studioSeason.cashBalance < movie.basePrice){
            return next(new AppError("Insufficient funds in your season budget.", 400));
        }

        // لو معاه فلوس واشترى نحدث الفلوس الل فى المحفظة
        await StudioSeason.findByIdAndUpdate(
            studioSeason._id,
            {$inc: {cashBalance: -movie.basePrice}},
            {session , returnDocument: "after"}
        )

        const newAsset = await StudioAsset.create([{ 
            userId: userId,
            movieId: movie._id,
            seasonId: currentSeason._id,
            purchasePrice: movie.basePrice
        }], {session});

        await ActivityLog.create([{
            userId: userId,
            seasonId: currentSeason._id,
            type: 'MOVIE_PURCHASED',
            data: {
                movieId: movie._id,
                movieTitle: movie.title,
                moviePoster: movie.posterPath,
                purchasePrice: movie.basePrice,
                studioName: req.user.studioName 
            }
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            status: "success",
            message: "Movie successfully added to your studio!",
            data: {
                asset: newAsset[0],
                remainingBalance: StudioSeason.cashBalance 
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
    const currentSeason = await Season.findOne({
        status: {$in: ["PRE_SEASON" , "ACTIVE"]}
    })

    if(!currentSeason){
        return res.status(200).json({ status: "success", data: { movies: [] } });
    }
    // هنظبط ال pagination علشان الافلام لو كتير نقسمها
    const page = parseInt(req.query.page , 10) || 1;
    const limit = parseInt(req.query.limit , 10) || 20;
    const skip = (page - 1) * limit;

    const cacheKey = `upcomingMovies:${currentSeason._id}:${page}:${limit}`;

    const cachedData = await redisClient.get(cacheKey);

    if(cachedData){
        console.log("Getting data from cache");
        const parsedData = JSON.parse(cachedData);
        return res.status(200).json(parsedData);
    }

    const query = {
        status: "UPCOMING",
        seasonId: currentSeason._id
    };
    // هنجيب الافلام اللى لسه هتتعرض بس
    const movies = await Movie.find(query)
    .select("title posterPath backdropPath releaseDate basePrice")
    .sort({releaseDate: 1}).skip(skip).limit(limit);

    // هنحسب عدد الصفحات كلها
    const totalMovies = await Movie.countDocuments(query);
    const totalPages = Math.ceil(totalMovies / limit);

    const responsePayload = {
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
    }

    await redisClient.setEx(cacheKey , 86400 , JSON.stringify(responsePayload))

    res.status(200).json(responsePayload)
})

// هنجيب اعلى 8 افلام هنا ال top علشان نعرضهم فى الصفحة الرئيسية
export const getTopMovies = catchAsync(async (req , res , next) => {
    const currentSeason = await Season.findOne({ status: { $in: ['PRE_SEASON', 'ACTIVE'] } });
    const query = currentSeason ? { seasonId: currentSeason._id } : {};

    const cacheKey = `topMovies:${currentSeason ? currentSeason._id : ''}`

    const cachedData = await redisClient.get(cacheKey);

    if(cachedData){
        console.log('Getting top movies from cache');
        return res.status(200).json({
            status: "success",
            data: {
                movies: JSON.parse(cachedData)
            }
        })
    }
    
    const movies = await Movie.find(query)
    .sort({popularity: -1})
    .limit(8)
    .select("title posterPath backdropPath releaseDate basePrice basePriceInDollars");

    if(!movies){
        return next(new AppError("No movies found" , 404))
    };

    await redisClient.setEx(cacheKey , 86400 , JSON.stringify(movies))

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