import express from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv"
import swaggerUi from "swagger-ui-express";
import errorMiddleware from "./middlewares/errorMiddleware.js";
import AppError from "./utils/appError.js";
import authRouter from "./routes/auth.routes.js"
import marketRouter from "./routes/market.routes.js";
import movieRouter from "./routes/movie.routes.js";
import studioRouter from "./routes/studio.routes.js";
import leaguesRouter from "./routes/leagues.routes.js";
import seasonRouter from "./routes/season.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import userRouter from "./routes/user.routes.js";
import swaggerSpec from "./docs/swagger.js";
import rateLimit from "express-rate-limit";
import redisClient from "./config/redisClient.js";
import leaderboardRouter from "./routes/leaderboard.routes.js";
dotenv.config({path: "config/.env"})
const app = express();

// Middlewares
app.use(logger("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",  
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.urlencoded({ extended: false }));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 250, 
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true, 
    legacyHeaders: false,
});

app.use("/api" , globalLimiter)

if (process.env.NODE_ENV === 'development') {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customSiteTitle: "CineFantasty API Docs",
        explorer: true
    }));
    
    app.get("/api-docs.json", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.status(200).json(swaggerSpec);
    });
}

//ROUTES
app.use("/api/v1/auth" , authRouter)
app.use("/api/v1/user" , userRouter)
app.use("/api/v1/market" , marketRouter)
app.use("/api/v1/movie" , movieRouter)
app.use("/api/v1/studio" , studioRouter)
app.use("/api/v1/leagues" , leaguesRouter)
app.use("/api/v1/seasons" , seasonRouter)
app.use("/api/v1/dashboard" , dashboardRouter)
app.use("/api/v1/leaderboard" , leaderboardRouter)

app.all("/{*path}" , (req , res , next) => {
    next(new AppError(`Can't Find ${req.originalUrl} on this server!` , 404))
})
// Global Error Handler Middleware
app.use(errorMiddleware);

export default app;
