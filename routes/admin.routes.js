import { Router } from "express";
import { protect, restrictTo } from "../controllers/auth.controller.js";
import { getAllUsers, getUserPortfolio } from "../controllers/admin.controller.js";

const adminRouter = Router();

adminRouter.use(protect);

// هنا هنجيب كل اليوزرز
adminRouter.get("/users" , restrictTo("admin") , getAllUsers);

// هنا هنجيب الداتا الكاملة لليوور
adminRouter.get("/users/:userId" , restrictTo("admin") , getUserPortfolio)

export default adminRouter;