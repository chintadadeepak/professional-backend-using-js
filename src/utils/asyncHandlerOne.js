// async-handler function takes
// fn as an argument and returns an arrow function
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    error.status(error.code || 500).json({
      success: false,
      message: error.message,
    });
  }
};
