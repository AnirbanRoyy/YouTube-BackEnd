import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description, video, owner } = req.body;

    if (!name) {
        throw new ApiError(400, "name of the playlist is required");
    }

    if (video.length == 0) {
        throw new ApiError(400, "add videos to the playlist");
    }

    if (!owner) {
        throw new ApiError(400, "ownerId not sent");
    }

    const playlist = await Playlist.create({
        name,
        description,
        video,
        owner,
    });

    if (!playlist) {
        throw new ApiError(500, "Failed to create playlist");
    }

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                _id: playlist._id,
                name: playlist.name,
                description: playlist.description,
            },
            "Playlist created successfully!"
        )
    );
});

const getPlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const parsedLimit = Math.max(parseInt(limit) || 10, 1);
    const parsedPage = Math.max(parseInt(page) || 1, 1);

    const aggregateOptions = {
        limit: parsedLimit,
        page: parsedPage,
    };

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId sent");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "No such playlist found");
    }

    const playlists = await Playlist.aggregatePaginate(
        Playlist.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(playlistId),
                },
            },
            {
                $unwind: {
                    path: "$video",
                },
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "video",
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
                                            _id: 1,
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $unwind: {
                                path: "$owner",
                            },
                        },
                    ],
                },
            },
            {
                $unwind: "$video",
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
                                _id: 1,
                                fullName: 1,
                                username: 1,
                                avatar: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: "$owner",
                },
            },
            {
                $replaceRoot: { newRoot: "$video" },
            },
        ]),
        aggregateOptions
    );

    if (!playlists) {
        throw new ApiError(500, "Failed to get the playlist");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                _id: playlist._id,
                name: playlist.name,
                description: playlist.description,
                owner: playlist.owner,
                video: playlists.docs,
            },
            "Playlist fetched successfully"
        )
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const userId = req?.user?._id;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid playlistId sent");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "No such playlist found");
    }

    if (userId.toString() != playlist.owner._id.toString()) {
        throw new ApiError(401, "Unauthorized to update this playlist");
    }

    const { name, description, video } = req.body;

    // Build update object dynamically
    const updateObj = {};
    if (name !== undefined) updateObj.name = name;
    if (description !== undefined) updateObj.description = description;
    if (video !== undefined) updateObj.video = video;

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $set: updateObj },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to update the playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Playlist updated successfully!"
            )
        );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const userId = req?.user?._id;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid playlistId sent");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "No such playlist found");
    }

    if (playlist.owner._id.toString() !== userId.toString()) {
        throw new ApiError(401, "Unauthorized to delete this playlist")
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if (!deletedPlaylist) {
        throw new ApiError(500, "Failed to delete the playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully!"));
});

export { createPlaylist, getPlaylist, updatePlaylist, deletePlaylist };
