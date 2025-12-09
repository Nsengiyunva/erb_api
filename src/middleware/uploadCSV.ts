import multer from "multer";
import { RequestHandler } from "express";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

export const uploadCSV: RequestHandler = upload.single("file");
