import express from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv"
import errorMiddleware from "./middlewares/errorMiddleware.js";
import AppError from "./utils/appError.js";
dotenv.config({path: "config/.env"})
const app = express();

// Middlewares
app.use(logger("dev"));
app.use(express.json());
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || "http://127.0.0.1:3000", 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

//ROUTES

app.all("/{*path}" , (req , res , next) => {
    next(new AppError(`Can't Find ${req.originalUrl} on this server!` , 404))
})
// Global Error Handler Middleware
app.use(errorMiddleware);

export default app;
