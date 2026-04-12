import { Router } from "express";
import { buyMovie, getTopMovies, getUpcomingMovies } from "../controllers/market.controller.js";
import { protect } from "../controllers/auth.controller.js";

const marketRouter = Router();

marketRouter.get("/" , getUpcomingMovies);
marketRouter.get("/get-top-movies" , getTopMovies);
marketRouter.post("/buy-movie/:movieId" , protect , buyMovie)

export default marketRouter; 