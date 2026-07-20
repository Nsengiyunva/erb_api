import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "/home/user1/uploads/users";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

export const uploadUserPicture = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB — matches updateUserProfile
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  }
});
