import { Router } from "express";
import {
    loginUser,
    logoutUser,
    registerUser,
    refreshAccessToken,
    updateUserDetails,
    changeCurrentPassword,
    getCurrentUser,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    addToWatchHistory,
    getUserPlaylists,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    registerUser
);

router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/get-user").get(verifyJWT, getCurrentUser);
router.route("/update-user-details").patch(verifyJWT, updateUserDetails);
router
    .route("/get-user-channel-profile/:username")
    .post(verifyJWT, getUserChannelProfile);

router
    .route("/update-avatar")
    .patch(verifyJWT, upload.single("avatar"), updateAvatar);
router
    .route("/update-coverImage")
    .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

router.route("/get-watch-history").get(verifyJWT, getWatchHistory);

router.route("/update-watch-history/:videoId").patch(verifyJWT, addToWatchHistory);

router.route("/:userId/playlists").get(verifyJWT, getUserPlaylists);

export default router;
