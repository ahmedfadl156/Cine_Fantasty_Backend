import { Router } from "express";
import { getMyStudioAssets } from "../controllers/studioAsset.controller.js";
import { protect } from "../controllers/auth.controller.js";

const studioRouter = Router();

studioRouter.get("/my-studio" , protect , getMyStudioAssets);

export default studioRouter;