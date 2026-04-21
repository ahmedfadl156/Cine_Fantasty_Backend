import { Router } from "express";
import { applyStreamingRevenue, getCommandCenterStats, sanitizeMarketDatabase } from "../controllers/dashboard.controller.js";

const dashboardRouter = Router();

dashboardRouter.get("/get-dashboard-data" , getCommandCenterStats);
dashboardRouter.post("/sanitize-data" , sanitizeMarketDatabase)
dashboardRouter.post("/apply-streaming-revenue/:movieId" , applyStreamingRevenue)
export default dashboardRouter;