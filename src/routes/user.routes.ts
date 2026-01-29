import { Router } from 'express';
import { importCSV, updateUser } from '../controllers/old_user_controller';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });
const router = Router();

router.post('/import', upload.single('file'), importCSV);

//update user
router.put('/:id', updateUser);

export default router;
