import { Router } from "express";
import { uploadCSV } from "../middleware/uploadCSV";
import { importEngineersFromCsv, checkhealth } from "../controllers/engineer_controller";

const router = Router();

// POST /engineers/import-csv
router.post("/import-csv", uploadCSV, importEngineersFromCsv);
router.get( "/checkhealth", checkhealth );

export default router;
