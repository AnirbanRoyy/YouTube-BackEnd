import mongoose from "mongoose";

const viewSchema = new mongoose.Schema(
    {
        video: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video",
        },
        viewer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

export const View = mongoose.model("View", viewSchema);
