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
router.route("/get-user").post(verifyJWT, getCurrentUser);
router.route("/update-user-details").patch(verifyJWT, updateUserDetails);
router.route("/get-user-channel-profile").post(verifyJWT, getUserChannelProfile)

router.route("/update-avatar").patch(
    upload.single("avatar"),
    verifyJWT,
    updateAvatar
);
router.route("/update-coverImage").patch(
    upload.single("coverImage"),
    verifyJWT,
    updateCoverImage
);

export default router;
