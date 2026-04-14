import { Router } from "express";
import { createLeague, getLeagueActivityFeed, getLeagueById, getLeagueLeaderboard, getMyLeagues, getPublicLeagues, joinLeague, joinPublicLeague } from "../controllers/leagues.controller.js";
import { protect } from "../controllers/auth.controller.js";

const leaguesRouter = Router();

leaguesRouter.use(protect);

// دا الراوت الخاص بانشاء دورى جديد
leaguesRouter.post("/create" , createLeague)
// دا الراوت اللى بيخلى اليوزر يدخل الدورى البرايفت عن طريق الكود
leaguesRouter.post("/join" , joinLeague)

// دا الراوت اللى بيدخل اليوزر الدورى العام
leaguesRouter.post("/join-public/:leagueId" , joinPublicLeague)
// هنا الروات اللى بيجيب كل الدوريات العامه علشان نعرضها لليوزرز
leaguesRouter.get("/get-public-leagues" , getPublicLeagues)
// هنا الروت المسئول انه يجيب الدوريات الخاصة باليوزر
leaguesRouter.get("/my-leagues" , getMyLeagues)

// هنا الراوت المسئول عن معلومات الدورى
leaguesRouter.get("/get-league-details/:leagueId" , getLeagueById)

// هنا هنجيب الترتيب بتاع اليوزرز فى الدورى
leaguesRouter.get("/get-league-leaderboard/:leagueId" , getLeagueLeaderboard)

// هنا هنجيب ال activity feed
leaguesRouter.get("/get-league-activity-feed/:leagueId" , getLeagueActivityFeed)
export default leaguesRouter;