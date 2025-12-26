import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
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

router.get("/display/:registrationNo", authenticate, (req, res) => {
  res.send("File endpoint hit: " + req.params.registrationNo);
});



export default router;