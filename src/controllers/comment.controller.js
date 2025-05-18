import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

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
                    $and: [
                        { parentComment: null },
                        { video: new mongoose.Types.ObjectId(videoId) },
                    ],
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
        parentComment: null, // top-level
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

    // delete the replies (if any)
    const replies = await Comment.aggregate([
        {
            $match: {
                parentComment: new mongoose.Types.ObjectId(commentId),
            },
        },
    ]);

    if (replies.length != 0) {
        replies.map(async (reply) => {
            await Comment.findByIdAndDelete(reply._id);
        });
    }

    await Comment.findByIdAndDelete(commentId);

    res.status(200).json(
        new ApiResponse(200, {}, "Comment deleted successfully")
    );
});

const addReply = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "invalid commentId sent");
    }

    const parent = await Comment.findById(commentId);

    if (!parent) {
        throw new ApiError(404, "No such parent comment found");
    }

    if (parent.parentComment !== null) {
        throw new ApiError(
            400,
            "Cannot reply to a reply. Only top-level comments can be replied to."
        );
    }

    if (content?.trim() === "") {
        throw new ApiError("no content in the reply");
    }

    const reply = await Comment.create({
        content,
        owner: req.user._id,
        parentComment: commentId,
    });

    if (!reply) {
        throw new ApiError(500, "Failed to create the reply");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, reply, "Reply created successfully"));
});

const getReplies = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "invalid commentId sent");
    }

    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
        throw new ApiError(404, "no such parent comment found");
    }

    const comments = await Comment.aggregatePaginate(
        Comment.aggregate([
            {
                $match: {
                    parentComment: new mongoose.Types.ObjectId(commentId),
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
                                fullName: 1,
                                username: 1,
                                avatar: 1,
                            },
                        },
                    ],
                },
            },
        ])
    );

    if (!comments) {
        throw new ApiError(500, "Failed to fetch the replies to the comment");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, comments.docs, "Replies fetched successfully")
        );
});

const updateReply = asyncHandler(async (req, res) => {
    const { commentId, replyId } = req.params;
    const { content } = req.body;

    if (!content.trim()) {
        throw new ApiError(401, "No content found while editing the reply");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "No such comment found");
    }

    const reply = await Comment.findById(replyId);
    if (!reply) {
        throw new ApiError(404, "No such reply found");
    }

    if (req?.user?._id?.toString() !== reply?.owner?.toString()) {
        throw new ApiError(401, "Only the owner of the reply can edit it");
    }

    if (reply.parentComment.toString() !== comment._id.toString()) {
        throw new ApiError("parent comment doesn't match");
    }

    const updatedReply = await Comment.findByIdAndUpdate(
        replyId,
        {
            $set: {
                content,
            },
        },
        {
            new: true,
        }
    );

    if (!updatedReply) {
        throw new ApiError(500, "Failed to update the reply");
    }

    res.status(200).json(
        new ApiResponse(200, updatedReply, "Reply updated successfully")
    );
});

const deleteReply = asyncHandler(async (req, res) => {
    const { commentId, replyId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError("Invalid commentId sent while deleting comment");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "No such comment found");
    }

    if (!isValidObjectId(replyId)) {
        throw new ApiError(400, "invalid replyId sent");
    }

    const reply = await Comment.findById(replyId);
    if (!reply) {
        throw new ApiError(404, "No such reply found");
    }

    if (reply.parentComment.toString() !== comment._id.toString()) {
        throw new ApiError(400, "parent comment does not match");
    }

    if (req?.user?._id.toString() !== reply.owner.toString()) {
        throw new ApiError(401, "Not authorized to delete this reply");
    }

    await Comment.findByIdAndDelete(replyId);

    res.status(200).json(
        new ApiResponse(200, {}, "Reply deleted successfully")
    );
});

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment,
    addReply,
    getReplies,
    updateReply,
    deleteReply,
};
