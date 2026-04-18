import { Router } from "express";
import { getCommandCenterStats, sanitizeMarketDatabase } from "../controllers/dashboard.controller.js";

const dashboardRouter = Router();

dashboardRouter.get("/get-dashboard-data" , getCommandCenterStats);
dashboardRouter.post("/sanitize-data" , sanitizeMarketDatabase)
export default dashboardRouter;