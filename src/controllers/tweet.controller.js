import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content?.trim()) {
        throw new ApiError(401, "No content found while creating a tweet");
    }

    if (!req?.user?._id) {
        throw new ApiError(401, "User not authenticated!");
    }

    const tweet = await Tweet.create({
        owner: new mongoose.Types.ObjectId(req?.user?._id),
        content,
    });

    if (!tweet) {
        throw new ApiError(500, "Failed to create a tweet");
    }

    res.status(201).json(
        new ApiResponse(201, tweet, "Tweet created successfully")
    );
});

const getUserTweets = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    // Ensure `limit` is a valid positive integer, default to 10 if invalid
    const parsedLimit = Math.max(parseInt(limit) || 10, 1);
    const parsedPage = Math.max(parseInt(page) || 1, 1);

    const aggregateOptions = {
        limit: parsedLimit,
        page: parsedPage,
    };

    const { userId } = req.params;
    if (!userId) {
        throw new ApiError(
            401,
            "userId not received while getting user tweets"
        );
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, `No user found for the userId : ${userId}`);
    }

    const tweets = await Tweet.aggregatePaginate(
        Tweet.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId),
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
                $sort: {
                    createdAt: -1,
                },
            },
            {
                $project: {
                    owner: 1,
                    content: 1,
                    createdAt: 1,
                },
            },
        ]),
        aggregateOptions
    );

    res.status(200).json(
        new ApiResponse(200, tweets, "Tweets fetched successfully")
    );
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    // Ensure the user is authenticated
    if (!req?.user?._id) {
        throw new ApiError(401, "User not Authenticated to update the tweet");
    }

    // Validate tweetId
    if (!tweetId) {
        throw new ApiError(400, "Send tweetId to update the tweet");
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
    if (tweet?.owner?.toString() !== req.user._id.toString()) {
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
    ).select("-owner"); // Exclude the owner field from the response
    if (!updatedTweet) {
        throw new ApiError(500, "Failed to update the tweet");
    }

    // Send a success response
    res.status(200).json(
        new ApiResponse(200, updatedTweet, "Tweet updated successfully")
    );
});

export { createTweet, getUserTweets, updateTweet };
