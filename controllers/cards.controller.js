import Card from "../models/card.model.js";
import StudioAsset from "../models/studioAsset.model.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const getAllCards = catchAsync(async(req , res , next) => {
    const userId = req.user._id;


    if(!userId){
        return next(new AppError("You must be logged in to view cards" , 400));
    }

    const cards = await Card.find({isActive: true}).sort({ createdAt: -1 });

    if(!cards){
        return next(new AppError("No cards found" , 404));
    }

    res.status(200).json({
        status: "success",
        results: cards.length,
        data: {
            cards
        }
    });
})

// الفانكشن الخاصة بتفعيل الكروت
export const applyCardToMovie = async (req , res , next) => {
    const {purchasedmovieId , cardCode} = req.body;
    const userId = req.user._id;

    if(!userId){
        return next(new AppError("You must be logged in to apply cards" , 400));
    }

    // هنشوف هل الكارت دا موجود فعلا وشغال
    const card = await Card.findOne({code: cardCode , isActive: true});
    if(!card){
        return next(new AppError("Invalid or inactive card code" , 400));
    }

    // بعد كدا هنجيب بيانات الفيلم
    const purchasedMovie = await StudioAsset.findOne({
        _id: purchasedmovieId,
        userId: userId,
    }).populate("movieId");

    if(!purchasedMovie){
        return next(new AppError("No movie found with that ID" , 404));
    }

    const actualMovie = purchasedMovie.movieId;

    if(purchasedMovie.appliedCard !== null){
        return next(new AppError("A card has already been applied to this movie" , 400));
    }

    if(new Date(actualMovie.releaseDate) <= new Date()){
        return next(new AppError("Cannot apply card to a movie that has already been released" , 400));
    }

    if(card.budgetConstraint && actualMovie.basePrice > card.budgetConstraint){
        return next(new AppError(`This card can only be applied to movies with a base price of ${card.budgetConstraint / 100} dollars or less` , 400));
    }

    const userCardsCount = await StudioAsset.countDocuments({
        userId: userId,
        appliedCard: {$ne: null},
        seasonId: purchasedMovie.seasonId
    });

    if(userCardsCount >= 2){
        return next(new AppError("You can only apply cards to 2 movies per season" , 400));
    }

    purchasedMovie.appliedCard = card._id;
    await purchasedMovie.save();

    res.status(200).json({
        status: "success",
        message: `Card ${card.name} applied successfully to movie ${actualMovie.title}`,
        data: {
            appliedCard: card.code,
            userCardsThisSeason: userCardsCount + 1
        }
    });
}



// ************** ADMIN FUNCTIONALITY **************
export const createCard = catchAsync(async (req , res , next) => {
    const {name , code , description , multiplier , isProtection , budgetConstraint} = req.body;

    if(!code){
        return next(new AppError("Please enter a code for the card" , 400));
    }

    const upperCaseCode = code.toUpperCase().trim();

    const existingCard = await Card.findOne({code: upperCaseCode});
    if(existingCard){
        return next(new AppError("A card with that code already exists" , 400));
    }

    const newCard = await Card.create({
            name,
            code: upperCaseCode,
            description,
            multiplier,
            isProtection,
            budgetConstraint
        });

    res.status(201).json({
            status: "success",
            message: `Card ${newCard.name} created successfully`,
            data: {
                card: newCard
            }
    });
})

export const updateCard = catchAsync(async (req , res , next) => {
    const {id} = req.params;

    if(req.body.code){
        return next(new AppError("Cannot update card code" , 400));
    }

    const updatedCard = await Card.findByIdAndUpdate(id , req.body , {
        returnDocument: "after",
        runValidators: true
    });

    if(!updatedCard){
        return next(new AppError("Card not found" , 404));
    }

    res.status(200).json({
        status: "success",
        message: `Card ${updatedCard.name} updated successfully`,
        data: {
            card: updatedCard
        }
    });
});


export const toggleCardStatus = catchAsync(async (req , res , next) => {
    const {id} = req.params;
    const card = await Card.findById(id);
    if(!card){
        return next(new AppError("Card not found" , 404));
    }

    card.isActive = !card.isActive;
    await card.save();

    const statusMessage = card.isActive ? "activated" : "deactivated";

    res.status(200).json({
        status: "success",
        message: `Card ${statusMessage} successfully`,
        data: card
    })
})

export const getAllCardsForAdmin = catchAsync(async(req , res , next) => {
    const cards = await Card.find().sort({ createdAt: -1 });

        res.status(200).json({
            status: "success",
            results: cards.length,
            data: {
                cards
            }
        });
})
