import { Router } from "express";
import {
    createTweet,
    updateTweet,
    getAllTweets,
    deleteTweet,
    getTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// CRUD operations
router.route("/").post(verifyJWT, createTweet);
router.route("/").get(getAllTweets);
router.route("/:tweetId").get(getTweet);
router.route("/:tweetId").patch(verifyJWT, updateTweet);
router.route("/:tweetId").delete(verifyJWT, deleteTweet);

export default router;
