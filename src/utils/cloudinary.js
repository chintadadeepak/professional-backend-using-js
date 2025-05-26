import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY.CLOUD_NAME,
  api_key: process.env.CLOUDINARY.API_KEY,
  api_secret: process.env.CLOUDINARY.API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // if the path exists, upload on to the cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log(`resource url : ${response.url}`);
    return response;
  } catch (error) {
    // if upload operation get fail,
    // remove the locally file stored from the server
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary };
