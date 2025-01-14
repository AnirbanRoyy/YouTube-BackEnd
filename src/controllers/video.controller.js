import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
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
    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
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
    const video = await Video.create({
        videoFile: videoFile.url,
        description,
        title,
        thumbnail: thumbnail.url,
        owner: req.user._id,
    });
    if (!video) {
        throw new ApiError(500, "Failed to create a video document");
    }

    // send a response
    return res
        .status(201)
        .json(new ApiResponse(200, video, "Video Published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(
            400,
            "Improper videoId sent while trying to get the video"
        );
    }

    const video = await Video.findById(new mongoose.Types.ObjectId(videoId));
    if (!video) {
        throw new ApiError(
            404,
            "No such video found while trying to get the video"
        );
    }

    const videoAggregate = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$owner",
        },
    ]);

    // increment views if video fetched successfully
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    });

    // add this video to user watch history
    await User.findByIdAndUpdate(req?.user?._id, {
        $addToSet: {
            watchHistory: videoId
        }
    });

    res.status(200).json(
        new ApiResponse(200, videoAggregate[0], "Video fetched successfully")
    );
});

export { publishVideo, getVideoById };
