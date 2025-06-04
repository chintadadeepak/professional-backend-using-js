import { Router } from "express";
const userRouter = Router();
import {
  registerUser,
  loginUser,
  logoutUser,
  generateNewAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

userRouter.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

userRouter.route("/login").post(loginUser);

userRouter.route("/logout").post(verifyJWT, logoutUser);

userRouter.route("/new-access-token").post(generateNewAccessToken);

userRouter.route("/change-password").post(verifyJWT, changeCurrentPassword);

userRouter.route("/user").get(verifyJWT, getCurrentUser);

userRouter.route("/user").put(verifyJWT, updateAccountDetails);

userRouter
  .route("/update-user-avatar")
  .put(upload.single("avatar"), verifyJWT, updateUserAvatar);

userRouter
  .route("/update-user-coverImage")
  .put(upload.single("coverImage"), verifyJWT, updateUserCoverImage);
export { userRouter };
