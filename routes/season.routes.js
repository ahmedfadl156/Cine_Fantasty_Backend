import { Router } from "express";
import { protect, restrictTo } from "../controllers/auth.controller.js";
import { createSeason, getAdminSeasonDetails, getAllSeasons, updateSeasonDetails, updateSeasonStatus } from "../controllers/seasons.controller.js";

const seasonRouter = Router();

seasonRouter.use(protect);

seasonRouter.get("/getAllSeasons" , restrictTo("admin") , getAllSeasons);
seasonRouter.post("/create" , restrictTo("admin") , createSeason)
seasonRouter.patch("/updateStatus/:id" , restrictTo("admin") , updateSeasonStatus);
seasonRouter.patch("/updateDetails/:id" , restrictTo("admin") , updateSeasonDetails)
seasonRouter.get("/getSeasonStats/:id" , restrictTo("admin") , getAdminSeasonDetails)
export default seasonRouter;