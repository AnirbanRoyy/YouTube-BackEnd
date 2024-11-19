import { v2 as cloudinary } from "cloudinary";
import { asyncHandler } from "./asyncHandler.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const deleteFromCloudinary = asyncHandler(async (cloudinaryUrl) => {
    try {
        // Extracting the public ID from the URL
        const publicId = cloudinaryUrl.split("/").pop().split(".")[0];

        // Deleting the file by public ID
        const result = await cloudinary.uploader.destroy(publicId);

        // Logging result
        console.log("Old avatar deleted:", result);
    } catch (error) {
        console.error("Error deleting old avatar:", error);
    }
});

export { deleteFromCloudinary };
