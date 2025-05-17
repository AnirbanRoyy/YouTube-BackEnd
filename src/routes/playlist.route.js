import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createPlaylist,
    deletePlaylist,
    getPlaylist,
    updatePlaylist,
} from "../controllers/playlist.controller.js";

const router = Router();

router.route("/").post(verifyJWT, createPlaylist);
router.route("/:playlistId").get(verifyJWT, getPlaylist);
router.route("/:playlistId").patch(verifyJWT, updatePlaylist);
router.route("/:playlistId").delete(verifyJWT, deletePlaylist);

export default router;
