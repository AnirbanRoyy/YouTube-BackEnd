import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Ensure `limit` is a valid positive integer, default to 10 if invalid
    const parsedLimit = Math.max(parseInt(limit) || 10, 1);

    const comments = await Comment.aggregate([
        {
            $match: {
                video: videoId,
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails",
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "userDetails",
            },
        },
        {
            $unwind: "$videoDetails",
        },
        {
            $unwind: "$userDetails",
        },
        {
            $skip: (page - 1) * parsedLimit, // Pagination: skips to the correct page
        },
        {
            $limit: parsedLimit, // Limits the number of comments per page
        },
        {
            $project: {
                content: 1,
                videoDetails: 1,
                userDetails: 1,
            },
        },
    ]);

    res.status(200).json(
        new ApiResponse(200, comments, "Comments fetched successfully!")
    );
});

const addComment = asyncHandler(async (req, res) => {
    const videoId = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
        throw new ApiError(401, "No content found while adding comment");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "No video found while adding comment");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: video.owner,
    });

    if (!comment) {
        throw new ApiError(500, "Failed to add a comment");
    }

    res.status(200).json(
        new ApiResponse(200, comment, "Comment added successfully")
    );
});

export { getVideoComments, addComment };
