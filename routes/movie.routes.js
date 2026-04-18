import { Router } from "express";
import { forceSyncMovies, getAdminMovies, getMovieDetails, testSync, updateMovieAdmin } from "../controllers/movie.controller.js";
import { protect, restrictTo } from "../controllers/auth.controller.js";

const movieRouter = Router();

movieRouter.get("/get-movie-details/:id" , getMovieDetails);


movieRouter.use(protect)
// ADMIN ROUTES
movieRouter.get("/get-all-movies" , restrictTo("admin") , getAdminMovies);
movieRouter.patch("/update-movie/:id" , restrictTo("admin") , updateMovieAdmin);
movieRouter.post("/sync-movies" , restrictTo("admin") , forceSyncMovies)
movieRouter.post("/test-sync" , restrictTo("admin") , testSync)
export default movieRouter;