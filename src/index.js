// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
// import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
// const app = express();
// const PORT = process.env.PORT;

dotenv.config({
  path: "./env",
});

const PORT = process.env.PORT;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`SERVER IS LISTENING AT PORT: ${PORT}`));
  })
  .catch((error) => console.log(`ERROR WHILE CONNECTING TO DB: ${error}`));

// (async () => {
//   try {
//     mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on("error", (error) => {
//       console.error(`ERROR WHILE CONNECTING TO DATABASE: ${error}`);
//       throw error;
//     });
//     app.listen(PORT, () => {
//       console.log(`Server is listening on the port: ${PORT}`);
//     });
//   } catch (error) {
//     console.error(error);
//     throw error;
//   }
// })();
