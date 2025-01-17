import { Router } from "express";
import {
    getAllVideos,
    getVideoById,
    publishVideo,
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
router.route("/get-all-videos").get(verifyJWT, getAllVideos);

export default router;
