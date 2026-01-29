import { Router } from 'express';
import { importCSV, updateUser } from '../controllers/old_user_controller';
import multer from 'multer';
import { getCurrentUser } from "../controllers/old_user_controller";
import { authenticate } from "../middleware/authenticate";

const upload = multer({ dest: 'uploads/' });
const router = Router();

router.post('/import', upload.single('file'), importCSV);

//update user
router.put('/:id', updateUser);

router.get("/getUserDetails", authenticate, getCurrentUser);

export default router;
