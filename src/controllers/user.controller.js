import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandlerTwo.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong, while generating refresh && access tokens!!"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get the user data from frontend.
  // validate whether data was actually sent or not, without empty values.
  // verify whether user exists or not.
  // verify whether the user has sent the avatar image.
  // if yes, upload it into the cloudinary.
  // if everything is fine, create a new entry in the db.
  // verify after inserting it, also remove the password and refresh-token from the response.
  // return the response to the client.

  const { email, password, fullName, username } = req.body;
  if (
    [email, password, fullName, username].some(
      (eachValue) => eachValue?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required!!");
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser)
    throw new ApiError(
      409,
      "User with provided email or username already exists!"
    );

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  )
    coverImageLocalPath = req.files.coverImage[0].path;
  if (!avatarLocalPath) throw new ApiError(400, "Avatar Image is required");
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar)
    throw new ApiError(500, "Got an error, while uploading avatar Image!!");

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
  });

  const createdUser = await User.findById(user?._id).select(
    "-password -refreshToken"
  );

  if (!createdUser)
    throw new ApiError(500, "Got an error while registering a user!!");
  res
    .status(201)
    .json(new ApiResponse(200, "User Registered successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  // console.log(username, password);

  if (!username && !email)
    throw new ApiError(400, "username or email is required!!");
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) throw new ApiError(404, "usser not found!!");
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid user credentials!!");
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "User Logged In Successfully", {
        user: loggedInUser,
        accessToken,
        refreshToken,
      })
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const options = {
    httpOnly: true,
    secure: true,
  };

  await User.findByIdAndUpdate(
    req.user._id,
    {
      // initially I tried to set the refreshToken to undefined, but it was not working
      // to avoid that, I changed the refreshToken to 1
      /* $set: {
      //   refreshToken: undefined,
      // }, */
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  console.log("Changes were made successfully!!");

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User Logged out successfully", {}));
});

const generateNewAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken)
    throw new ApiError(401, "Refresh Token is required!!");
  try {
    const decodedRefreshToken = jwt.verify(incomingRefreshToken);
    const user = await User.findById(decodedRefreshToken?._id);
    if (!user) throw new ApiError(401, "Invalid Refresh Token!!");
    if (incomingRefreshToken !== user.refreshToken)
      throw new ApiError(401, "Refresh Tokens were not identical!!");
    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", refreshToken)
      .json(
        new ApiResponse(200, "new refresh token has been generated", {
          accessToken,
          refreshToken,
        })
      );
  } catch (error) {
    throw new ApiError(
      401,
      "something went wrong, while creating a new refresh token"
    );
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  const isPasswordCorrect = user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) throw new ApiError(400, "Invalid Old Password!!");
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, "Password updated successfully!!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, "current user fetched successfully", req.user));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName && !email)
    throw new ApiError(
      400,
      "at least one detail has to be provided to update the account details!!"
    );
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { fullName, email },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, "account details has been updated", user));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath)
    throw new ApiError(400, "Avatar Image path was missing!!");

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) throw new ApiError(500, "Error while updating avatar!!");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, "avatar updated successfully", user));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath)
    throw new ApiError(400, "CoverImage path was missing!!");

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url)
    throw new ApiError(500, "Error while updating coverImage!!");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, "coverImage updated successfully", user));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) throw new ApiError(400, "username is missing!!");
  const channelData = await User.aggregate([
    // match operator to fetch the user to return his/her channel profile
    {
      $match: {
        username: username.toLowerCase(),
      },
    },
    // count of people who were following me.
    {
      $lookup: {
        from: "subscribers",
        localField: "_id",
        foreignField: "channel",
        as: "mySubscribers",
      },
    },
    // count of people whom I was following.
    {
      // count of people whom I was following.
      $lookup: {
        from: "subscribers",
        localField: "_id",
        foreignField: "subscriber",
        as: "iSubscribedTo",
      },
    },
    // adding subscribersCount,iSubscribedChannelsCnt, isSubscribed flag
    {
      $addFields: {
        mySubscribersCount: {
          $size: "$mySubscribers",
        },
        iSubscribedToCount: {
          $size: "$iSubscribedTo",
        },
        // returning a boolean value, based on which the UI dev will display either
        // subscribed or subscribe
        isSubsribed: {
          // condition operator had three parts
          // 1. IF condition
          // 2. THEN, if IF condition was true, it'll return true
          // 3. returns the opposite of IF condition
          $cond: {
            if: { $in: [req.user?._id, "$mySubscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    // returning the fields which we want to send to the frontend
    {
      $project: {
        fullName: 1,
        username: 1,
        mySubscribersCount: 1,
        iSubscribedToCount: 1,
        isSubsribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channelData?.length) throw new ApiError("channel does not exists!!");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "channel data has been fetched successfully!!",
        channelData[0]
      )
    );
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  const userWatchHistory = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Schema.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              $first: "$owner",
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "user watch history has been fetched successfully",
        userWatchHistory[0].watchHistory
      )
    );
});

export {
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
};
