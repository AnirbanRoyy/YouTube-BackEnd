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

router.route("/publish-video").post(
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

router.route("/get-video/:videoId").get(verifyJWT, getVideoById);
router.route("/get-self-videos").get(verifyJWT, getSelfVideos);
router.route("/get-all-videos").get(getAllVideos);
router.route("/update-video/:videoId").patch(verifyJWT, upload.single("thumbnail"), updateVideo);
router.route("/delete-video/:videoId").post(verifyJWT, deleteVideo);
router.route("/toggle-publish/:videoId").patch(verifyJWT, togglePublishVideo);

export default router;
