import express from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv"
import errorMiddleware from "./middlewares/errorMiddleware.js";
import AppError from "./utils/appError.js";
import authRouter from "./routes/auth.routes.js"
import marketRouter from "./routes/market.routes.js";
import movieRouter from "./routes/movie.routes.js";
import studioRouter from "./routes/studio.routes.js";
import leaguesRouter from "./routes/leagues.routes.js";
import seasonRouter from "./routes/season.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
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

//ROUTES
app.use("/api/v1/auth" , authRouter)
app.use("/api/v1/market" , marketRouter)
app.use("/api/v1/movie" , movieRouter)
app.use("/api/v1/studio" , studioRouter)
app.use("/api/v1/leagues" , leaguesRouter)
app.use("/api/v1/seasons" , seasonRouter)
app.use("/api/v1/dashboard" , dashboardRouter)

app.all("/{*path}" , (req , res , next) => {
    next(new AppError(`Can't Find ${req.originalUrl} on this server!` , 404))
})
// Global Error Handler Middleware
app.use(errorMiddleware);

export default app;
