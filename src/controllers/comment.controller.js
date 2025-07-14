import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId sent");
    }

    if (!content?.trim()) {
        throw new ApiError(400, "No content found while adding comment");
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

    const commentAggregate = await Comment.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(comment._id),
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
        {
            $unwind: "$owner",
        },
    ]);

    res.status(201).json(
        new ApiResponse(201, commentAggregate, "Comment added successfully")
    );
});

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
    } = req.query;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId sent");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "No such video found");
    }

    // Ensure `limit` is a valid positive integer, default to 10 if invalid
    const parsedLimit = Math.max(parseInt(limit) || 10, 1);
    const parsedPage = Math.max(parseInt(page) || 1, 1);

    const aggregateOptions = {
        limit: parsedLimit,
        page: parsedPage,
    };

    const sortObj = {};
    sortObj[sortBy] = sortOrder.toLowerCase() === "desc" ? -1 : 1;

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
            {
                $sort: sortObj,
            },
        ]),
        aggregateOptions
    );

    res.status(200).json(
        new ApiResponse(200, comments, "Comments fetched successfully!")
    );
});

const updateComment = asyncHandler(async (req, res) => {
    const { videoId, commentId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId sent");
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commentId sent");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "No such video found");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "No comment matches the id as commentId");
    }

    if (!content.trim()) {
        throw new ApiError(400, "No content found while editing the comment");
    }

    // Check if the user is authorized to edit the comment
    if (req.user._id.toString() !== comment.owner.toString()) {
        throw new ApiError(403, "Only the owner of the comment can edit it");
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

    const updatedCommentWithOwner = await Comment.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(updatedComment._id),
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
        {
            $unwind: "$owner",
        },
    ]);

    res.status(200).json(
        new ApiResponse(
            200,
            updatedCommentWithOwner,
            "Comment updated successfully"
        )
    );
});

const deleteComment = asyncHandler(async (req, res) => {
    const { videoId, commentId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId sent");
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(
            400,
            "Invalid commentId sent while deleting comment"
        );
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "No such video found");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "No such comment exists");
    }

    if (req.user._id.toString() !== comment.owner.toString()) {
        throw new ApiError(403, "Not authorized to delete this comment");
    }

    // delete the comment
    const deletedComment = await Comment.findByIdAndDelete(commentId);
    if (!deletedComment) {
        throw new ApiError(500, "Failed to delete the comment");
    }

    // delete the replies (if any)
    const deletedReplies = await Comment.deleteMany({
        parentComment: commentId,
    });
    if (!deletedReplies) {
        throw new ApiError(500, "Failed to delete replies of this comment");
    }

    res.status(204).json(
        new ApiResponse(204, {}, "Comment deleted successfully")
    );
});

// Get all comments in DB
const getAllComments = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    // Ensure `limit` is a valid positive integer, default to 10 if invalid
    const parsedLimit = Math.max(parseInt(limit) || 10, 1);
    const parsedPage = Math.max(parseInt(page) || 1, 1);

    const aggregateOptions = {
        page: parsedPage,
        limit: parsedLimit,
    };

    const allComments = await Comment.aggregatePaginate(
        Comment.aggregate([
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
            {
                $unwind: "$owner",
            },
        ]),
        aggregateOptions
    );
    if (!allComments) {
        throw new ApiError(500, "Failed to fetch all comments in DB");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, allComments, "Fetched all comments in DB"));
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
    getAllComments,
    getVideoComments,
    addComment,
    updateComment,
    deleteComment,
    addReply,
    getReplies,
    updateReply,
    deleteReply,
};
