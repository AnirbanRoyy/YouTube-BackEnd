import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content?.trim()) {
        throw new ApiError(400, "No content found while creating a tweet");
    }

    const tweet = await Tweet.create({
        owner: new mongoose.Types.ObjectId(req.user._id),
        content,
    });
    if (!tweet) {
        throw new ApiError(500, "Failed to create a tweet");
    }

    res.status(201).json(
        new ApiResponse(201, tweet, "Tweet created successfully")
    );
});

const getAllTweets = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    // Ensure `limit` is a valid positive integer, default to 10 if invalid
    const parsedLimit = Math.max(parseInt(limit) || 10, 1);
    const parsedPage = Math.max(parseInt(page) || 1, 1);

    const aggreagateOptions = {
        page: parsedPage,
        limit: parsedLimit,
    };

    const allTweets = await Tweet.aggregatePaginate(
        Tweet.aggregate([
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
        aggreagateOptions
    );
    if (!allTweets) {
        throw new ApiError(500, "Failed to fetch all the tweets");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, allTweets, "Fetched all tweets"));
});

const getTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId sent");
    }

    const tweetExists = await Tweet.findById(tweetId);
    if (!tweetExists) {
        throw new ApiError(404, "No such tweet found");
    }

    const tweet = await Tweet.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(tweetId),
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

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    // Validate tweetId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId sent when updating the tweet");
    }

    // Validate content
    if (!content?.trim()) {
        throw new ApiError(400, "Content is required to update the tweet");
    }

    // Find the tweet by ID
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "No such tweet exists");
    }

    // Check if the authenticated user is the owner of the tweet
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only the owner of the tweet can edit it"); // unauthorized access to tweet
    }

    // Update the tweet
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
            },
        },
        {
            new: true, // Return the updated document
        }
    );
    if (!updatedTweet) {
        throw new ApiError(500, "Failed to update the tweet");
    }

    const tweetWithOwner = await Tweet.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(updatedTweet._id),
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

    // Send a success response
    res.status(200).json(
        new ApiResponse(200, tweetWithOwner, "Tweet updated successfully")
    );
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId sent to delete a tweet");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(
            404,
            `No tweet found for the tweetId -> ${tweetId} while deleting tweet`
        );
    }

    // Check if the user is authorized to delete the tweet
    if (req.user._id.toString() !== tweet.owner.toString()) {
        throw new ApiError(403, "Only the owner of the tweet can delete it");
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);
    if (!deletedTweet) {
        throw new ApiError(500, "Failed to delete the tweet");
    }

    res.status(204).json(
        new ApiResponse(204, {}, "Tweet deleted successfully!")
    );
});

export { createTweet, getAllTweets, getTweet, updateTweet, deleteTweet };
