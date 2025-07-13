import { Router } from "express";
import {
    deleteVideo,
    getAllVideos,
    getSelfVideos,
    getVideoById,
    publishVideo,
    togglePublishVideo,
    updateVideo,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// actions
router.route("/get-self-videos").get(verifyJWT, getSelfVideos);
router.route("/toggle-publish/:videoId").post(verifyJWT, togglePublishVideo);

// CRUD operations
router.route("/").post(
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1,
        },
        {
            name: "thumbnail",
            maxCount: 1,
        },
    ]),
    verifyJWT,
    publishVideo
);
router.route("/").get(getAllVideos);
router.route("/:videoId").get(getVideoById);
router.route("/:videoId").patch(verifyJWT, upload.single("thumbnail"), updateVideo);
router.route("/:videoId").delete(verifyJWT, deleteVideo);

export default router;
