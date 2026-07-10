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
  getAllUsers,
//   importCSV,
} from '../controllers/old_user_controller';
import { authenticate } from '../middleware/authenticate';
 
const router = Router();
 
// Serve profile pictures (public, no auth)
router.get('/uploads/:filename', serveProfilePicture);

// Auth-protected user routes
// FIX: router is already mounted at "/old/users" in server.ts, so these
// paths must NOT repeat the "/users" segment — the previous version
// ('/users/:id', '/users/me', '/users/:id/profile') resolved to
// "/old/users/users/:id" etc, which the frontend never actually called
// (it calls "/old/users/:id"), so profile updates were silently 404ing.
router.get('/me',          authenticate, getCurrentUser)
router.get('/:id',         authenticate, getUserById)
router.put('/:id',         authenticate, updateUser)
router.get('/',  getAllUsers)            // admin: all fields

// Self-service profile update — handles text fields + optional photo upload
// The uploadProfilePicture multer middleware runs FIRST, then updateUserProfile
router.put('/:id/profile', authenticate, uploadProfilePicture, updateUserProfile);
 
export default router;
