import { Router } from "express";
import { protect } from "../controllers/auth.controller.js";
import {
    buyMovieFromMarket,
    cancelMovieListing,
    getMarketListings,
    listMovieForSale
} from "../controllers/transfermarket.controller.js";

const transferMarketRouter = Router();

transferMarketRouter.use(protect);

transferMarketRouter.get("/", getMarketListings);
transferMarketRouter.post("/list-movie", listMovieForSale);
transferMarketRouter.post("/buy-movie", buyMovieFromMarket);
transferMarketRouter.patch("/cancel-listing", cancelMovieListing);

export default transferMarketRouter;
