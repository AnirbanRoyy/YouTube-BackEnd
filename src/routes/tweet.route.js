import { Router } from "express";
import {
    createTweet,
    updateTweet,
    getUserTweets,
    deleteTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/get-all-tweets/:userId").get(getUserTweets);

// secured routes
router.route("/add-tweet").post(verifyJWT, createTweet);
router.route("/update-tweet/:tweetId").patch(verifyJWT, updateTweet);
router.route("/delete-tweet/:tweetId").post(verifyJWT, deleteTweet)

export default router;
