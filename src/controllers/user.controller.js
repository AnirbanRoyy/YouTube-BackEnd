import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteFromCloudinary } from "../utils/deleteCloudinary.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import fs from "fs";
import { Playlist } from "../models/playlist.model.js";
import { Tweet } from "../models/tweet.model.js";

// Create a user
const registerUser = asyncHandler(async (req, res) => {
    // get data from req.body
    const { username, email, password, fullName } = req.body;

    // validate the data
    if (
        [username, email, password, fullName].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "Required fields are missing");
    }

    // get avatar and coverImage
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    // validate the avatar
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar Local Path not found");
    }

    // check if user exists
    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    });
    if (existingUser) {
        throw new ApiError(400, "User already exists");
    }

    // upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // create user
    const user = await User.create({
        username: username.split(" ").join(""), // the user might send a username with spaces that might cause problem when getting user channel details from url
        fullName,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", // coverImage maybe null, so do optional chaining
    });

    // validate the creation
    if (!user) {
        throw new ApiError(500, "User could not be registered");
    }

    // remove the password and refresh token fields
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // return res
    return res
        .status(201)
        .json(
            new ApiResponse(201, createdUser, "User registered successfully!!!")
        );
});

// Fetch all the users in DB
const getAllUsers = asyncHandler(async (req, res) => {
    const { limit = 10, page = 1 } = req.query;

    // Ensure `limit` is a valid positive integer, default to 10 if invalid
    const parsedLimit = Math.max(parseInt(limit) || 10, 1);
    const parsedPage = Math.max(parseInt(page) || 1, 1);

    const aggreagateOptions = {
        page: parsedPage,
        limit: parsedLimit,
    };

    const allUsers = await User.aggregatePaginate(
        User.aggregate([
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    username: 1,
                    email: 1,
                    avatar: 1,
                    coverImage: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]),
        aggreagateOptions
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, allUsers.docs, "Users fetched successfully!")
        );
});

// Get a user through the userId
const getUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId sent!");
    }

    const user = await User.findById(userId).select("-password -refreshToken");

    if (!user) {
        throw new ApiError(404, "User not found!");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User fetched successfully!"));
});

// Update the user details such as email and fullName
const updateUserDetails = asyncHandler(async (req, res) => {
    const { email, fullName } = req.body;
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId sent when updating user");
    }

    if (req.user._id.toString() !== userId.toString()) {
        throw new ApiError(403, "Can't update other users!");
    }

    if (!email && !fullName) {
        throw new ApiError(400, "Send either email or fullName to update");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                email,
                fullName,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedUser,
                "User details updated successfully"
            )
        );
});

// Delete User
const deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId sent when deleting user");
    }

    if (req.user._id.toString() !== userId.toString()) {
        throw new ApiError(403, "Can't remove other users!");
    }

    // delete all videos posted by this user
    const deletedVideos = await Video.deleteMany({ owner: userId });
    if (!deletedVideos) {
        console.warn("Failed to delete the videos uploaded by this user.");
    }

    const deletedUser = await User.findByIdAndDelete(req.user._id);

    if (!deletedUser) {
        throw new ApiError(500, "Failed to remove user!");
    }

    return res
        .status(204)
        .json(new ApiResponse(204, {}, "User removed successfully!"));
});

// Other functions that the user can perform:
const generateAccessAndRefreshTokens = async function (userId) {
    const user = await User.findById(userId);

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    // store the refreshToken in db
    user.refreshToken = refreshToken;
    await user.save({
        validateBeforeSave: false,
    });

    return {
        accessToken,
        refreshToken,
    };
};

const loginUser = asyncHandler(async (req, res) => {
    // get data
    const { username, email, password } = req.body;

    // check if both username and email are missing
    if (!username && !email) {
        throw new ApiError(
            400,
            "Both username and email are missing during login"
        );
    }

    // find the user
    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(404, "No such user found during login");
    }

    // validate the password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid Password during login");
    }

    // generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    // remove password and refreshToken fields
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // set options for cookies
    const options = {
        httpOnly: true,
        secure: true,
    };

    // send cookies as well as res
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                201,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // get the refreshToken
    const incomingRefreshToken =
        req.cookies?.refreshToken ||
        req.header("Authorization").replace("Bearer ", "");
    if (!incomingRefreshToken) {
        throw new ApiError(
            400,
            "refreshToken not found to refresh access token"
        );
    }

    // decode the token
    const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
        throw new ApiError(401, "Invalid refreshToken");
    }

    // verify the token
    if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "refreshToken is expired or used");
    }

    // generate the new tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    user.refreshToken = refreshToken;
    await user.save({
        validateBeforeSave: false,
    });

    const options = {
        httpOnly: true,
        secure: true,
    };

    // send cookies and a response
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken,
                },
                "New tokens generated successfully"
            )
        );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    // get the passwords
    const { oldPassword, newPassword } = req.body;

    // validate the data
    if ([oldPassword, newPassword].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Required fields are missing");
    }

    // we will be using verifyJwt middleware in user.route.js

    // get user from req
    const user = await User.findById(req.user?._id);

    // check if old password is correct
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid oldPassword");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "User password updated successfully!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                req.user,
                "Current User details sent successfully"
            )
        );
});

const updateAvatar = asyncHandler(async (req, res) => {
    // get the avatar local path through multer
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar Local Path not found to update");
    }

    // upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // delete old image
    const oldAvatarUrl = req?.user?.avatar;
    if (!oldAvatarUrl) {
        throw new ApiError(400, "oldAvatarUrl not found");
    }

    deleteFromCloudinary(oldAvatarUrl);

    // remove from local file system
    fs.unlinkSync(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(
            500,
            "Failed to upload on cloudinary while updating"
        );
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
    // get the avatar local path through multer
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "coverImage Local Path not found to update");
    }

    // upload on cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage) {
        throw new ApiError(
            400,
            "Failed to upload on cloudinary while updating"
        );
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    // dekete old image

    return res
        .status(200)
        .json(new ApiResponse(200, user, "coverImage updated successfully"));
});

const getUserProfile = asyncHandler(async (req, res) => {
    // get username from the url
    const { username } = req.params;

    const userId = req.user?._id;

    if (!username?.trim()) {
        throw new ApiError(
            400,
            "No username found while getting user channel profile"
        );
    }

    const user = await User.findOne({ username });
    if (!user) {
        throw new ApiError(404, "No such user found!");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "subscriber",
                            foreignField: "_id",
                            as: "subscriber",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        email: 1,
                                        avatar: 1,
                                        coverImage: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $unwind: "$subscriber",
                    },
                    { $replaceRoot: { newRoot: "$subscriber" } },
                ],
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "channel",
                            foreignField: "_id",
                            as: "channel",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        email: 1,
                                        avatar: 1,
                                        coverImage: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $unwind: "$channel",
                    },
                    { $replaceRoot: { newRoot: "$channel" } },
                ],
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                subscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [userId, "$subscribers._id"],
                        },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                username: 1,
                fullName: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribers: 1,
                subscribedToCount: 1,
                subscribedTo: 1,
                isSubscribed: 1,
                watchHistory: 1,
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            channel?.[0], // because we only have one object in the array
            "User Profile fetched successfully"
        )
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
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
                ],
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch History fetched successfully"
            )
        );
});

const addToWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(
            404,
            "No such video found while adding to watchHistory"
        );
    }

    const user = await User.findById(req.user._id).select(
        "-password -refreshToken"
    );
    if (!user) {
        throw new ApiError(
            404,
            "No such user found while updating watchHistory"
        );
    }

    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $addToSet: { watchHistory: videoId } },
        { new: true }
    );

    res.status(200).json(
        new ApiResponse(200, updatedUser, "WatchHistory updated!")
    );
});

const deleteFromWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(
            400,
            "Invalid videoId sent when removing video from watch history"
        );
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "No such video exists in DB");
    }

    const videoExists = await User.exists({
        _id: req.user._id,
        watchHistory: videoId,
    });
    if (!videoExists) {
        throw new ApiError(400, "Video is not present in watchHistory");
    }

    const updatedWatchHistory = await User.findByIdAndUpdate(
        req.user._id,
        {
            $pull: {
                watchHistory: videoId,
            },
        },
        {
            new: true,
        }
    ).select("-password -refreshToken");
    if (!updatedWatchHistory) {
        throw new ApiError(500, "Failed to update the watch history");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedWatchHistory,
                "Video removed from watch history"
            )
        );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    let { userId } = req.params;

    if (!userId) {
        userId = req?.user._id;
    }

    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "invalid userId sent");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "No such user found");
    }

    const playlists = await Playlist.aggregatePaginate(
        Playlist.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId),
                },
            },
        ])
    );

    if (!playlists) {
        throw new ApiError(500, "Failed to fetch the user's playlists");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlists.docs,
                "User playlists fetched successfully!"
            )
        );
});

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Ensure `limit` is a valid positive integer, default to 10 if invalid
    const parsedLimit = Math.max(parseInt(limit) || 10, 1);
    const parsedPage = Math.max(parseInt(page) || 1, 1);

    const aggregateOptions = {
        limit: parsedLimit,
        page: parsedPage,
    };

    if (!userId) {
        throw new ApiError(
            400,
            "Invalid userId received while getting user tweets"
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

export {
    registerUser,
    getAllUsers,
    getUser,
    updateUserDetails,
    deleteUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAvatar,
    updateCoverImage,
    getUserProfile,
    getWatchHistory,
    addToWatchHistory,
    deleteFromWatchHistory,
    getUserPlaylists,
    getUserTweets,
};
