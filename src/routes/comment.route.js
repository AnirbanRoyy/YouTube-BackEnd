import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    addReply,
    deleteReply,
    getReplies,
    updateReply,
} from "../controllers/comment.controller.js";

const router = Router();

// No CRUD operations for Comments here, because it is a sub-resource of videos

// CRUD operations for Replies
router.route("/:commentId/replies").post(verifyJWT, addReply);
router.route("/:commentId/replies").get(verifyJWT, getReplies);
router.route("/:commentId/replies/:replyId").patch(verifyJWT, updateReply);
router.route("/:commentId/replies/:replyId").delete(verifyJWT, deleteReply);

export default router;
