import { Comment } from "../models/comment.model";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

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

export { getVideoComments };
