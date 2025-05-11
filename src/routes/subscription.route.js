import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getSubscribedChannels,
    getChannelSubscribers,
    toggleSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();

// secured routes
router
    .route("/toggle-subscription/:channelId")
    .patch(verifyJWT, toggleSubscription);
router.route("/get-channel-subscribers/:channelId").get(getChannelSubscribers);
router.route("/get-subscribed-channels/:subscriberId").get(verifyJWT, getSubscribedChannels);

export default router;
