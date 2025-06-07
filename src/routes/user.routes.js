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
  getUserChannelProfile,
  getUserWatchHistory,
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

userRouter.route("/user").patch(verifyJWT, updateAccountDetails);

userRouter
  .route("/update-user-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

userRouter
  .route("/update-user-coverImage")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

userRouter
  .route("/get-channel-profile/:username")
  .get(verifyJWT, getUserChannelProfile);

userRouter.route("/get-user-watch-history").get(verifyJWT, getUserWatchHistory);
export { userRouter };
