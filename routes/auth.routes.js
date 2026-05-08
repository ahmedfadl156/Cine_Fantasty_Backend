import { Router } from "express";
import rateLimit from "express-rate-limit";
import { facebookLogin, getMe, googleLogin, login, logout, protect, signup } from "../controllers/auth.controller.js";
import { testSync } from "../controllers/movie.controller.js";
import { signupValidator } from "../middlewares/validators/authValidator.js";

const authRouter = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: "Too many login attempts from this IP , please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false
})

authRouter.post('/login' , loginLimiter , login);
authRouter.post('/logout' , logout);
authRouter.post('/signup' , loginLimiter , signupValidator , signup);
authRouter.get('/getMe' , protect , getMe);
authRouter.post('/test-sync' , testSync);
authRouter.post("/google" , googleLogin);
authRouter.post("/facebook" , facebookLogin);
export default authRouter;