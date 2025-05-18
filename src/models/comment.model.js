import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new mongoose.Schema(
    {
        content: {
            required: true,
            type: String,
            trim: true,
        },
        video: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video",
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        parentComment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    },
    { timestamps: true }
);

commentSchema.plugin(mongooseAggregatePaginate);

