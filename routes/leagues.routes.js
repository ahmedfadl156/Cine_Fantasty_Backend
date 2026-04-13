import { Router } from "express";
import { createLeague, getMyLeagues, getPublicLeagues, joinLeague } from "../controllers/leagues.controller.js";
import { protect } from "../controllers/auth.controller.js";

const leaguesRouter = Router();

leaguesRouter.use(protect);

leaguesRouter.post("/create" , createLeague)
leaguesRouter.post("/join" , joinLeague)
leaguesRouter.get("/get-public-leagues" , getPublicLeagues)
leaguesRouter.get("/my-leagues" , getMyLeagues)
export default leaguesRouter;