import { Router } from "express";
import { uploadCSV } from "../middleware/uploadCSV";
import { importEngineersFromCsv, checkhealth, importPaidList,  getAllPaidRecords,
    getPaidRecordById, } from "../controllers/engineer_controller";

const router = Router();


//importr engineers
router.post("/import-csv", uploadCSV, importEngineersFromCsv);

//import paid csv
router.post( "/pull-paid-list", uploadCSV, importPaidList);

router.get( "/checkhealth", checkhealth );
router.get("/paid-records", getAllPaidRecords);
router.get("/paid-records/:id", getPaidRecordById);

export default router;
