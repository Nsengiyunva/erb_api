// import { Router } from "express";
// // import { checkhealth, register, login, profile } from "../controllers/auth_controller";
// import { authMiddleware } from "../middleware/authMiddleware";

// const router = Router();

// router.post("/register", register);
// router.post("/login", login);
// router.get("/profile", authMiddleware, profile);
// router.get("/health-checkpoint", checkhealth);


// export default router;
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import {
  register,
  login,
  forgotPassword,
  resetPassword
} from "../controllers/auth_controller";
import { uploadUserPicture } from "../middleware/uploadPicture";

const router = Router();

// Run multer inside a wrapper so upload problems (photo > 5 MB, not an image,
// truncated upload) come back as a clean JSON 4xx. Left unhandled, multer's
// error aborts the request mid-body and nginx reports it as "502 Bad Gateway",
// which the browser then shows as "Server unreachable".
const handlePictureUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadUserPicture.single("user_picture")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Profile photo is too large. Please upload an image smaller than 5 MB."
          : `Upload error: ${err.message}`;
      return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message });
    }
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[register] upload failed:", message);
    return res.status(400).json({ message });
  });
};

router.post("/register", handlePictureUpload, register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
