import { Router } from "express";
import { getMovieDetails } from "../controllers/movie.controller.js";

const movieRouter = Router();

movieRouter.get("/get-movie-details/:id" , getMovieDetails);

export default movieRouter;