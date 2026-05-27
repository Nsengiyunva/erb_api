// import { Router } from 'express';
// import { importCSV, updateUser, updateUserProfile, uploadProfilePicture } from '../controllers/old_user_controller';
// import multer from 'multer';
// import { getCurrentUser } from "../controllers/old_user_controller";
// import { authenticate } from "../middleware/authenticate";

// const upload = multer({ dest: 'uploads/' });
// const router = Router();

// router.post('/import', upload.single('file'), importCSV);

// //update user
// router.put('/:id', updateUser);

// router.get("/getUserDetails", authenticate, getCurrentUser);
// router.put('/update-profile/:id', uploadProfilePicture, updateUserProfile)

// export default router;

import { Router } from 'express';
import {
  getUserById,
  updateUser,
  updateUserProfile,
  uploadProfilePicture,
  serveProfilePicture,
  getCurrentUser,
//   importCSV,
} from '../controllers/old_user_controller';
import { authenticate } from '../middleware/authenticate';
 
const router = Router();
 
// Serve profile pictures (public, no auth)
router.get('/uploads/:filename', serveProfilePicture);
 
// Auth-protected user routes
router.get('/users/me',          authenticate, getCurrentUser);
router.get('/users/:id',         authenticate, getUserById);
router.put('/users/:id',         authenticate, updateUser);               // admin: all fields
 
// Self-service profile update — handles text fields + optional photo upload
// The uploadProfilePicture multer middleware runs FIRST, then updateUserProfile
router.put('/users/:id/profile', authenticate, uploadProfilePicture, updateUserProfile);
 
export default router;
