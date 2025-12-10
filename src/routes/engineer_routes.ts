import { Router } from "express";
import { uploadCSV } from "../middleware/uploadCSV";
import { importEngineersFromCsv, checkhealth, importPaidList } from "../controllers/engineer_controller";

const router = Router();

// POST /engineers/import-csv
router.post("/import-csv", uploadCSV, importEngineersFromCsv);
router.post( "/pull-paid-list", uploadCSV, importPaidList);
router.get( "/checkhealth", checkhealth );

export default router;
