import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const publishVideo = asyncHandler(async (req, res) => {
    // get data from frontend
    const { title, description } = req.body;

    // validate the data
    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(
            401,
            "Please enter all the fields needed during video publish"
        );
    }

    // get video and thumbnail through multer
    const videoLocalPath = req.files?.videoFile?.path;
    const thumbnailLocalPath = req.file?.thumbnail?.path;
    if (!videoLocalPath) {
        throw new ApiError(
            401,
            "Video Local Path not found while publishing video"
        );
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(
            401,
            "Thumbnail Local Path not found while publishing video"
        );
    }

    // upload on Cloudinary
    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!videoFile) {
        throw new ApiError(500, "Video File failed to upload to Cloudinary");
    }
    if (!thumbnail) {
        throw new ApiError(500, "Thumbnail failed to upload to Cloudinary");
    }

    // Create a video document
    const video = await Video({
        videoFile,
        description,
        title,
        thumbnail,
    });
    if (!video) {
        throw new ApiError(500, "Failed to create a video document");
    }

    // send a response
    return res
        .status(201)
        .json(new ApiResponse(200, video, "Video Published successfully"));
});

export { publishVideo };
