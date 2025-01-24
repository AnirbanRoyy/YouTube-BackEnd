import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteFromCloudinary } from "../utils/deleteCloudinary.js";
import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import fs from "fs";

const registerUser = asyncHandler(async (req, res) => {
    // get data from req.body
    const { username, email, password, fullName } = req.body;

    // validate the data
    if (
        [username, email, password, fullName].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(401, "Required fields are missing");
    }

    // get avatar and coverImage
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    // validate the avatar
    if (!avatarLocalPath) {
        throw new ApiError(401, "Avatar Local Path not found");
    }

    // check if user exists
    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    });
    if (existingUser) {
        throw new ApiError(401, "User already exists");
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
        coverImage: coverImage.url || "",
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
            new ApiResponse(200, createdUser, "User registered successfully!!!")
        );
});

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
            401,
            "Both username and email are missing during login"
        );
    }

    // find the user
    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(400, "No such user found during login");
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
        .status(201)
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
            401,
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

    // we will be using verifyJwt middleware in user.route.js

    // get user from req
    const user = await User.findById(req.user?._id);

    // check if old password is correct
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
        throw new ApiError("Invalid oldPassword");
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

const updateUserDetails = asyncHandler(async (req, res) => {
    const { email, fullName } = req.body;

    if (!email && !fullName) {
        throw new ApiError(400, "Send either email or fullName to update");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                email: email || req.user.email,
                fullName: fullName || req.user.fullName,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User details updated successfully"));
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
        throw new ApiError(401, "oldAvatarUrl not found");
    }

    deleteFromCloudinary(oldAvatarUrl);

    // remove from local file system
    fs.unlinkSync(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(
            401,
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
            401,
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

const getUserChannelProfile = asyncHandler(async (req, res) => {
    // get username from the url
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(
            400,
            "No username found while getting user channel profile"
        );
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
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
                            $in: [req.user?._id, "$subscribers.subscriber"],
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
                subscribedToCount: 1,
                isSubscribed: 1,
                watchHistory: 1,
            },
        },
    ]);

    if (!channel.length) {
        // because the output is an array of objects
        throw new ApiError(
            404,
            "No channel found while getting userChannelProfile"
        );
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            channel?.[0], // because we only have one object in the array
            "User Channel Profile fetched successfully"
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

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(
            404,
            "No such video found while adding to watchHistory"
        );
    }

    const user = await User.findById(req?.user?._id).select(
        "-password -refreshToken"
    );
    if (!user) {
        throw new ApiError(
            404,
            "No such user found while updating watchHistory"
        );
    }

    if (!user.watchHistory.includes(videoId)) {
        user.watchHistory.push(videoId);
        await user.save({ validateBeforeSave: false });
    }

    res.status(200).json(new ApiResponse(200, user, "WatchHistory updated!"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    addToWatchHistory,
};
