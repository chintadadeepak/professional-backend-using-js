import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

async function connectDB() {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(`DB HOSTED ON: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error(`Error while connecting to the db: ${error}`);
    process.exit(1);
  }
}

export default connectDB;
