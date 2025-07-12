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
    getUserProfile,
    getWatchHistory,
    addToWatchHistory,
    getUserPlaylists,
    getAllUsers,
    getUser,
    deleteUser,
    deleteFromWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// CRUD opeartions
router.route("/").post(
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
router.route("/").get(verifyJWT, getAllUsers);
router.route("/:userId").get(verifyJWT, getUser);
router.route("/:userId").patch(verifyJWT, updateUserDetails);
router.route("/:userId").delete(verifyJWT, deleteUser);

// Actions routes
router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/get-current-user").post(verifyJWT, getCurrentUser);
router.route("/get-user-profile/:username").post(verifyJWT, getUserProfile);

router
    .route("/update-avatar")
    .patch(verifyJWT, upload.single("avatar"), updateAvatar);
router
    .route("/update-cover-image")
    .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

router.route("/get-watch-history").post(verifyJWT, getWatchHistory);

router
    .route("/add-to-watch-history/:videoId")
    .post(verifyJWT, addToWatchHistory);

router
    .route("/remove-from-watch-history/:videoId")
    .post(verifyJWT, deleteFromWatchHistory);

router.route("/:userId/playlists").get(verifyJWT, getUserPlaylists);

export default router;
