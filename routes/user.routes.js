import { Router } from "express";
import { protect } from "../controllers/auth.controller.js";
import { updateMe, updatePassword } from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.use(protect);
userRouter.patch("/updateMe" , updateMe);
userRouter.patch("/updateMyPassword" , updatePassword)
export default userRouter;