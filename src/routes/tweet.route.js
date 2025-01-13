import { Router } from "express";
import {
    createTweet,
    updateTweet,
    getUserTweets,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/get-all-tweets/:userId").get(getUserTweets);

// secured routes
router.route("/add-tweet").post(verifyJWT, createTweet);
router.route("/update-tweet/:tweetId").post(verifyJWT, updateTweet);

export default router;
