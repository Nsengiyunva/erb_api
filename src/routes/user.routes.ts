import { Router } from 'express';
import { importCSV } from '../controllers/old_user_controller';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });
const router = Router();

router.post('/import', upload.single('file'), importCSV);

export default router;
