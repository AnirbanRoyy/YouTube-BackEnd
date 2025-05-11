import mongoose, { isValidObjectId, Mongoose } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    // get the channel id from parameters
    const { channelId } = req.params;

    // check if it is a valid mongoose ObjectId
    if (!isValidObjectId(channelId)) {
        throw new ApiError(
            400,
            "Invalid channelId sent when toggling subscription"
        );
    }

    // find if any such subscription pre-exists
    const isSubscribed = await Subscription.findOne({
        subscriber: req?.user?._id,
        channel: channelId,
    });

    // if subscribed, then delete the found document
    if (isSubscribed) {
        await Subscription.findByIdAndDelete(isSubscribed?._id);

        return res.status(200).json(
            new ApiResponse(
                200,
                { isSubscribed: false },
                "Subscription cancelled successfully"
            )
        );
    }

    // if not already subscribed
    await Subscription.create({
        subscriber: req?.user?._id,
        channel: channelId,
    });

    return res.status(200).json(
        new ApiResponse(201, { isSubscribed: true }, "Subscribed successfully")
    );
});

// controller to return subscriber list of a channel
const getChannelSubscribers = asyncHandler(async (req, res) => {
    let { channelId } = req.params;

    channelId = new mongoose.Types.ObjectId(channelId)

    if (!isValidObjectId(channelId)) {
        throw new ApiError(
            400,
            "Invalid channelId sent when getting the subscriber list of channel"
        );
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: channelId,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribedToSubscriber",
                        },
                    },
                    {
                        $addFields: {
                            subscribedToSubscriber: {
                                $cond: {
                                    if: {
                                        $in: [
                                            channelId,
                                            "$subscribedToSubscriber.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                            subscribersCount: {
                                $size: "$subscribedToSubscriber",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$subscriber",
        },
        {
            $replaceRoot: { newRoot: "$subscriber" }
        },
        {
            $project: {
                _id: 1,
                username: 1,
                fullName: 1,
                avatar: 1,
                subscribedToSubscriber: 1,
                subscribersCount: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribers,
                "subscribers fetched successfully"
            )
        );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannel",
            },
        },
        {
            $unwind: "$subscribedChannel",
        },
        {
            $replaceRoot: { newRoot: "$subscribedChannel" }
        },
        {
            $project: {
                _id: 1,
                username: 1,
                fullName: 1,
                avatar: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedChannels,
                "subscribed channels fetched successfully"
            )
        );
});

export { toggleSubscription, getChannelSubscribers, getSubscribedChannels };
