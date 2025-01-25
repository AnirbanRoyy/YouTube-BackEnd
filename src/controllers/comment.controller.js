import mongoose, { isValidObjectId } from "mongoose";
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
    const parsedPage = Math.max(parseInt(page) || 1, 1);

    const aggregateOptions = {
        limit: parsedLimit,
        page: parsedPage,
    };

    const comments = await Comment.aggregatePaginate(
        Comment.aggregate([
            {
                $match: {
                    video: new mongoose.Types.ObjectId(videoId),
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "userDetails",
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
                    userDetails: 1,
                    createdAt: 1,
                },
            },
        ]),
        aggregateOptions
    );

    res.status(200).json(
        new ApiResponse(200, comments?.docs, "Comments fetched successfully!")
    );
});

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
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
        owner: req.user._id,
    });

    if (!comment) {
        throw new ApiError(500, "Failed to add a comment");
    }

    res.status(200).json(
        new ApiResponse(
            200,
            {
                _id: comment._id,
                content,
                userDetails: {
                    _id: req.user._id,
                    fullName: req.user.fullName,
                    username: req.user.username,
                    avatar: req.user.avatar,
                },
            },
            "Comment added successfully"
        )
    );
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content.trim()) {
        throw new ApiError(401, "No content found while editing the comment");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(401, "No comment matches the id as commentId");
    }

    if (req?.user?._id?.toString() !== comment?.owner?.toString()) {
        throw new ApiError(401, "Only the owner of the comment can edit it");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content,
            },
        },
        {
            new: true,
        }
    );

    if (!updatedComment) {
        throw new ApiError(500, "Failed to update the comment");
    }

    res.status(200).json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
    );
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError("Invalid commentId sent while deleting comment");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(
            401,
            "Invalid commentId sent. No such comment exists"
        );
    }

    if (req?.user?._id.toString() !== comment.owner.toString()) {
        throw new ApiError(401, "Not authorized to delete this comment");
    }

    await Comment.findByIdAndDelete(commentId);
    // No need for an additional check here since the comment's existence is already verified

    res.status(200).json(
        new ApiResponse(200, {}, "Comment deleted successfully")
    );
});

export { getVideoComments, addComment, updateComment, deleteComment };
