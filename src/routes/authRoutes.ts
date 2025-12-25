// import { Router } from "express";
// // import { checkhealth, register, login, profile } from "../controllers/auth_controller";
// import { authMiddleware } from "../middleware/authMiddleware";

// const router = Router();

// router.post("/register", register);
// router.post("/login", login);
// router.get("/profile", authMiddleware, profile);
// router.get("/health-checkpoint", checkhealth);


// export default router;
import { Router } from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword
} from "../controllers/auth_controller";
import { uploadUserPicture } from "../middleware/uploadPicture";

const router = Router();

router.post("/register", uploadUserPicture.single("user_picture"), register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
