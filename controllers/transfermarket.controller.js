import mongoose from "mongoose";
import StudioAsset from "../models/studioAsset.model.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import User from "../models/user.model.js";
import StudioSeason from "../models/studioSeason.model.js";

// هنا الفانكشن الخاصة بان اليوزر يعرض فيلم للشراء
export const listMovieForSale = catchAsync(async (req , res , next) => {
    const {assetid , price} = req.body;
    const userId = req.user._id;

    // هنجيب الفيلم من الاستوديو بتاع اليوزر
    const asset = await StudioAsset.findOne({_id: assetid , userId}).populate("movieId");

    if(!asset || asset.isForSale){
        return next(new AppError("Asset not found or already for sale" , 404));
    };

    // هنجيب التاريخ بتاع الفيلم علشان نشوف هل هو نزل السينما ولا لا
    const currentDate = new Date();
    const releaseDate = new Date(asset.movieId.releaseDate);

    if(currentDate >= releaseDate){
        return next(new AppError("You cant list the movie in market after its released in cinema" , 400));
    }

    // هنجيب  سعر الفيلم الحالى فى السوق
    const currentSystemPrice = asset.movieId.basePrice;
    console.log(currentSystemPrice);

    // هنحدد اقل واعلى سعر ممكن الفيلم يتعرض بيه فى الماركت
    const MIN_PRICE_PERCENTAGE = 0.75;
    const MAX_PRICE_PERCENTAGE = 1.20;

    const minumAllowedPrice = Math.round(currentSystemPrice * MIN_PRICE_PERCENTAGE);
    const maximumAllowedPrice = Math.round(currentSystemPrice * MAX_PRICE_PERCENTAGE);

    if(price < minumAllowedPrice || price > maximumAllowedPrice){
        return next(new AppError(`Price must be between ${minumAllowedPrice} and ${maximumAllowedPrice}` , 400));
    }

    // هنحط العرض فى السوق لو كله تمام
    asset.isForSale = true;
    asset.salePrice = price;
    await asset.save();

    res.status(200).json({
        status: "success",
        message: "Movie listed for sale successfully",
        data: {
            asset,
            marketStats: {
                systemPrice: currentSystemPrice,
                listedPrice: price,
            }
        }
    })
})


// هنا الفانكشن الخاصة بشراء فيلم
export const buyMovieFromMarket = catchAsync(async (req , res , next) => {
    const {assetid} = req.body;
    const buyerId = req.user._id;

    // هنعمل session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // هنجيب الفيلم ونتأكد انه معروض للبيع
        const asset = await StudioAsset.findOne({
            _id: assetid,
            isForSale: true,
        }).session(session);

        if(!asset){
            throw new AppError("Asset not found or not for sale" , 404);
        }

        // هنشوف هل الفيلم لسه متاح يعنى متعرضش فى السينما ولا لا 
        const currentDate = new Date();
        const releaseDate = new Date(asset.movieId.releaseDate);

        if(currentDate >= releaseDate){
            asset.isForSale = false;
            asset.salePrice = 0;
            await asset.save({session});
            await session.commitTransaction();
            session.endSession();

            throw new AppError("This asset is not for sale anymore" , 400);
        }

        // لو اليوزر عايز يشترى الفيلم بتاعه نمنعه من كده
        if(asset.userId.toString() === buyerId.toString()){
            throw new AppError("You can't buy your own asset" , 400);
        }

        // نجيب بيانات اللى هيبيع واللى هيشترى
        const buyer = await User.findById(buyerId).session(session);
        const seller = await User.findById(asset.userId).session(session);

        // هنجيب الرصيد الحالى لكل واحد منهم
        const buyerStudioSeason = await StudioSeason.findOne({userId: buyerId , seasonId: asset.seasonId}).session(session);
        const sellerStudioSeason = await StudioSeason.findOne({userId: seller._id , seasonId: asset.seasonId}).session(session);

        if(!buyerStudioSeason || !sellerStudioSeason){
            throw new AppError("Studio season not found" , 404);
        }

        if(buyerStudioSeason.cashBalance < asset.salePrice){
            throw new AppError("Insufficient balance" , 400);
        }

        // هننقص الفلوس من اللى اشتره ونزودها للبائع
        buyerStudioSeason.cashBalance -= asset.salePrice;
        sellerStudioSeason.cashBalance += asset.salePrice;

        // ننقل ملكية الفيلم لليوزر اللى اشتراه ونحفظ البيانات فى الداتابيز ونبعت الرد للفرونت اند
        asset.userId = buyer._id;
        asset.purchasePrice = asset.salePrice;
        asset.isForSale = false;
        asset.salePrice = 0;

        await buyerStudioSeason.save({session});
        await sellerStudioSeason.save({session});
        await asset.save({session});

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            status: "success",
            message: "Movie bought successfully",
            data: {
                asset,
                newBudget: buyerStudioSeason.cashBalance,
            }
        })
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("Failed to buy movie" , 500));
    }
})

// هنا الفانكشن الخاصة بالغاء عرض فيلم
export const cancelMovieListing = catchAsync(async (req , res , next) => {
    const {assetId} = req.body;
    const userId = req.user._id;

    // هنجيب الفيلم ونتأ:د انه بتاع اليوزر اللى بيحاول يلغيه وانه فعلا معروض للبيع
    const asset = await StudioAsset.findOneAndUpdate(
        {_id: assetId , userId , isForSale: true},
        {isForSale: false , salePrice: 0},
        {returnDocument: "after"}
    );

    if(!asset){
        return next(new AppError('No asset found with this id' , 404));
    };

    res.status(200).json({
        status: "success",
        message: "Asset unsold successfully"
    })
})

// هنا الفانكشن الخاصة بعرض كل الافلام اللى هتبقى للشراء
export const getMarketListings = catchAsync(async (req , res , next) => {
    // هنظبط اعدادات ال pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // هنظبط اعادات الترتيب
    const sortQuery = req.query.sort === "lowest_price" ? {salePrice: 1} : req.query.sort === "highest_price" ? {salePrice: -1} : {createdAt: -1};

    const listings = await StudioAsset.find({isForSale: true})
    .populate({
        path: "movieId",
        select: "title posterPath basePrice"
    })
    .populate({
        path: "userId",
        select: "studioName"
    })
    .sort(sortQuery)
    .skip(skip)
    .limit(limit);

    const totalListings = await StudioAsset.countDocuments({isForSale: true});

    res.status(200).json({
        status: 'success',
        results: listings.length,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalListings / limit),
            totalItems: totalListings
        },
        data: {
            listings
        }
    });
})
