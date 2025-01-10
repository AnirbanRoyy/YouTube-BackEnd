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

    const commentsAggregate = await Comment.aggregate([
        {
            $match: {
                video: videoId,
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
            $unwind: "$userDetails",
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 1, // so that the frontend person can attach this _id as a id to the div while creating the comment
                content: 1,
                userDetails: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                },
                createdAt: 1,
            },
        },
    ]);

    const options = {
        limit: parsedLimit,
        page,
    };

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    );

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

const updateComment = asyncHandler(async (req, res) => {
    const commentId = req.params;
    const {content} = req.body;

    if (!content.trim()) {
        throw new ApiError(401, "No content found while editing the comment");
    }

    
});

export { getVideoComments, addComment, updateComment };
