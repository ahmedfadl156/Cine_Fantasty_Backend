import { Router } from "express";
import { createLeague, joinLeague } from "../controllers/leagues.controller.js";
import { protect } from "../controllers/auth.controller.js";

const leaguesRouter = Router();

leaguesRouter.use(protect);

leaguesRouter.post("/create" , createLeague)
leaguesRouter.post("/join" , joinLeague)

export default leaguesRouter;