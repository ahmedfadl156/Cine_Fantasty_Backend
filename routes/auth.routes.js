import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, signup } from "../controllers/auth.controller.js";
import { testSync } from "../controllers/movie.controller.js";

const authRouter = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: "Too many login attempts from this IP , please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false
})

authRouter.post('/login' , loginLimiter , login);
authRouter.post('/signup' , loginLimiter , signup);
authRouter.post('/test-sync' , testSync);
export default authRouter;