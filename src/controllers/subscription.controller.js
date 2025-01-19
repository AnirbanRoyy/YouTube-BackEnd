import mongoose, { isValidObjectId } from "mongoose";
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

        res.status(200).json(
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

    res.status(200).json(
        new ApiResponse(201, { isSubscribed: true }, "Subscribed successfully")
    );
});

// controller to return subscriber list of a channel
const getChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(
            400,
            "Invalid channelId sent when getting the subscriber list of channel"
        );
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
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
                        $project: {
                            _id: 0,
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $group: {
                _id: "$subscriber",
                subscribers: {
                    $push: "$subscriber",
                },
            },
        },
    ]);

    res.status(200).json(
        new ApiResponse(
            200,
            subscribers?.subscribers,
            "Subscriber list of channe fetched successfully"
        )
    );
});

export { toggleSubscription, getChannelSubscribers };
