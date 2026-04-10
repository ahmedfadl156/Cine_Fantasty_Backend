import { Router } from "express";
import { getTopMovies, getUpcomingMovies } from "../controllers/market.controller.js";

const marketRouter = Router();

marketRouter.get("/" , getUpcomingMovies);
marketRouter.get("/get-top-movies" , getTopMovies);

export default marketRouter;