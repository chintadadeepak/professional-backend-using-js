import { asyncHandler } from "../utils/asyncHandlerTwo.js";

const registerUser = asyncHandler(async (req, res) => {
  res.status(201).json({
    message: "ok, everything went well",
  });
});

export { registerUser };
