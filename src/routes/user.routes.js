import { Router } from "express";
const userRouter = Router();
import { registerUser } from "../controllers/user.controller.js";

userRouter.route("/register").post(registerUser);

export { userRouter };
