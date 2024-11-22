import mongoose from "mongoose";

const tweetSchema = new mongoose.Schema({
    owner: {
        required: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    content: {
        required: true,
        type: String,
    }
}, { timestamps: true });

export const Tweet = mongoose.model("Tweet", tweetSchema);
