import { Router } from "express";
import { publishVideo } from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

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
    publishVideo
);

export default router;
