import { Router } from "express";
import { protect, restrictTo } from "../controllers/auth.controller.js";
import { createSeason, updateSeason } from "../controllers/seasons.controller.js";

const seasonRouter = Router();

seasonRouter.use(protect);

seasonRouter.post("/create" , restrictTo("admin") , createSeason)
seasonRouter.patch("/:id" , restrictTo("admin") , updateSeason);
export default seasonRouter;