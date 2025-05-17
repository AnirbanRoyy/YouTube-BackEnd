import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    addComment,
    addReply,
    deleteComment,
    deleteReply,
    getReplies,
    getVideoComments,
    updateComment,
    updateReply,
} from "../controllers/comment.controller.js";

const router = Router();

// secured routes
router.route("/get-all-comments/:videoId").get(verifyJWT, getVideoComments);
router.route("/add-comment/:videoId").post(verifyJWT, addComment);
router.route("/update-comment/:commentId").patch(verifyJWT, updateComment);
router.route("/delete-comment/:commentId").post(verifyJWT, deleteComment);

router.route("/:commentId/replies").post(verifyJWT, addReply);
router.route("/:commentId/replies").get(verifyJWT, getReplies);
router.route("/:commentId/replies/:replyId").patch(verifyJWT, updateReply);
router.route("/:commentId/replies/:replyId").delete(verifyJWT, deleteReply);

export default router;
