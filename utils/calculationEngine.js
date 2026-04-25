import Season from "../models/seasons.model.js";
import StudioAsset from "../models/studioAsset.model.js";
import User from "../models/user.model.js";
import { calculateAllNetWorth } from "../services/syncUpcomingMovies.js";

const calculateFinalRevenue = (purchasePrice , basePrice , actualBoxOfficeRevenue , appliedCard) => {
    if(!basePrice || basePrice === 0) return purchasePrice;

    const roi = actualBoxOffice / basePrice;
    const baseRevenue = purchasePrice * roi;
    const isHit = actualBoxOffice > basePrice;

    if (!appliedCard) return baseRevenue;

    if (isHit) {
        const baseProfit = baseRevenue - purchasePrice;
        const boostedProfit = baseProfit * appliedCard.multiplier;
        return purchasePrice + boostedProfit;
    } else {
        if (appliedCard.isProtection) {
            return purchasePrice; 
        }
        return baseRevenue;
    }
}

export const processMovieSettlement = async (movie) => {
    try {
        const assets = await StudioAsset.find({
            movieId: movie._id,
            isSettled: false
        }).populate("appliedCard");

        if(assets.length === 0){
            console.log("No assets to settle");
        }else{
            const userBulkOps = [];
            const assetBulkOps = [];

            for (const asset of assets) {
                const finalRevenue = calculateFinalRevenue(
                    asset.purchasePrice,
                    movie.basePrice,
                    movie.boxOfficeRevenue,
                    asset.appliedCard
                );

                userBulkOps.push({
                    updateOne: {
                        filter: { _id: asset.userId },
                        update: { $inc: { netWorth: finalRevenue } },
                    },
                });

                assetBulkOps.push({
                    updateOne: {
                        filter: {_id: asset._id},
                        update: {
                            $set: {
                                isSettled: true,
                                earnedRevenue: finalRevenue
                            }
                        }
                    }
                });
            }

            if(userBulkOps.length > 0) await User.bulkWrite(userBulkOps);
            if(assetBulkOps.length > 0) await StudioAsset.bulkWrite(assetBulkOps);
            console.log(`Settled ${assets.length} assets for movie ${movie.title}`);
        }

        const season = await Season.findById(movie.seasonId);
        if(season){
            await calculateAllNetWorth([season]);
            console.log(`Net worth recalculated for season ${season.name} after settling movie ${movie.title}`);
        }
    } catch (error) {
        console.error(`[Settlement CRITICAL ERROR] Failed for movie ${movie._id}:`, error);
    }
}