import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteFromCloudinary } from "../utils/deleteCloudinary.js";
import { Comment } from "../models/comment.model.js";
import { View } from "../models/view.model.js";

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

    // Check if already viewed
    const alreadyViewed = await View.findOne({
        video: videoId,
        viewer: req.user._id,
    });

    if (!alreadyViewed) {
        await View.create({
            video: videoId,
            viewer: req.user._id,
        });

        await Video.findByIdAndUpdate(videoId, {
            $inc: {
                views: 1,
            },
        });
    }

    // add this video to user watch history
    await User.findByIdAndUpdate(req?.user?._id, {
        $addToSet: {
            watchHistory: videoId,
        },
    });

    res.status(200).json(
        new ApiResponse(200, videoAggregate[0], "Video fetched successfully")
    );
});

const getSelfVideos = asyncHandler(async (req, res) => {
    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id),
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

    res.status(200).json(
        new ApiResponse(200, videos, "Videos fetched successfully")
    );
});

const getAllVideos = asyncHandler(async (req, res) => {
    let pipeline = [];

    // fetch only the videos that are to be published
    pipeline.push({
        $match: {
            isPublished: true,
        },
    });

    pipeline.push(
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
        }
    );

    const allVideos = await Video.aggregate(pipeline);

    res.status(200).json(
        new ApiResponse(200, allVideos, "Videos fetched successfully")
    );
});

//TODO: update video details like title, description, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId sent when updating the video");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "No such video found while updating");
    }

    if (req.user._id.toString() !== video.owner.toString()) {
        throw new ApiError(403, "Only the owner of the video can update it");
    }

    const { title, description } = req.body;

    const thumbnailLocalPath = req?.file?.path;
    let thumbnail = "";
    if (thumbnailLocalPath) {
        // delete old thumbnail
        const oldThumbnail = video.thumbnail;
        deleteFromCloudinary(oldThumbnail);

        // upload new one
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!thumbnail) {
            throw new ApiError(
                400,
                "No thumbnail found when updating the video"
            );
        }
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title?.trim() || video.title,
                description: description?.trim() || video.description,
                thumbnail: thumbnail?.url || video.thumbnail,
            },
        },
        {
            new: true,
        }
    );
    if (!updatedVideo) {
        throw new ApiError(500, "Failed to update the video");
    }

    res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(
            400,
            "Invalid objectId sent while deleting the video"
        );
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "No such video found while deletion");
    }

    if (req.user._id.toString() !== video.owner.toString()) {
        throw new ApiError(403, "Only the owner of the video can delete it");
    }

    // delete the uploaded files
    await deleteFromCloudinary(video.thumbnail);
    await deleteFromCloudinary(video.videoFile);

    const deletedVideo = await Video.findByIdAndDelete(videoId);
    if (!deletedVideo) {
        throw new ApiError(500, "Failed to delete the video");
    }

    // delete any comments of that video
    await Comment.deleteMany({
        video: videoId,
    });

    res.status(200).json(
        new ApiResponse(200, {}, "Video deleted successfully")
    );
});

const togglePublishVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId sent while toggling publish");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(
            404,
            "No such video found while toggling the publish button"
        );
    }

    if (req.user._id.toString() !== video.owner.toString()) {
        throw new ApiError(
            403,
            "Only the owner of the video can toggle the publish button"
        );
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished,
            },
        },
        {
            new: true,
        }
    );
    if (!updatedVideo) {
        throw new ApiError(500, "Failed to update the toggle button");
    }

    res.status(200).json(
        new ApiResponse(
            200,
            { isPublished: updatedVideo.isPublished },
            "Publish button toggled successfully"
        )
    );
});

export {
    publishVideo,
    getVideoById,
    getSelfVideos,
    getAllVideos,
    updateVideo,
    deleteVideo,
    togglePublishVideo,
};
