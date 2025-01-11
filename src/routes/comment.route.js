import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addComment, deleteComment, getVideoComments, updateComment } from "../controllers/comment.controller.js";

const router = Router();

// secured routes
router.route("/get-all-comments").post(verifyJWT, getVideoComments);
router.route("/add-comment").post(verifyJWT, addComment);
router.route("/update-comment").post(verifyJWT, updateComment);
router.route("/delete-comment").post(verifyJWT, deleteComment);

export default router;
