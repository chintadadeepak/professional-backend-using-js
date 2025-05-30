import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandlerTwo.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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
  if (!username || !email)
    throw new ApiError(400, "username or email is required!!");
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) throw new ApiError(404, "user not found!!");
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

  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User Logged out successfully", {}));
});

export { registerUser, loginUser, logoutUser };
