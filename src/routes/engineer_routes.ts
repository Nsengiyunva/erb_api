import { Router } from "express";
import fs from "fs";
import path from "path";
import { authenticate } from "../middleware/authenticate";
import { uploadCSV } from "../middleware/uploadCSV";
import { importEngineersFromCsv, checkhealth, importPaidList,  getAllPaidRecords,
    getPaidRecordById, } from "../controllers/engineer_controller";

const router = Router();

const FILE_DIR = "/var/ugpass/destination";

//importr engineers
router.post("/import-csv", uploadCSV, importEngineersFromCsv);

//import paid csv
router.post( "/pull-paid-list", uploadCSV, importPaidList);

router.get( "/checkhealth", checkhealth );
router.get("/paid-records", getAllPaidRecords);
router.get("/paid-records/:id", getPaidRecordById);

router.get("/display/:registrationNo", (req, res) => {
//   res.send("File endpoint hit: " + req.params.registrationNo);
const { registrationNo } = req.params;

  // 🔐 OPTIONAL: DB ownership check here

  // 🔍 Find file by registration number
  const files = fs.readdirSync(FILE_DIR);
  const filename = files.find(file =>
    file.includes(`_${registrationNo}`)
  );

  if (!filename) {
    return res.status(404).json({ message: "File not found" });
  }

  return res.status(200).json({ message: "File found", filename });

  // const safeFile = path.basename(filename);
  // const filePath = path.join(FILE_DIR, safeFile);

  // // 📄 Open inline (PDF / image)
  // res.setHeader("Content-Disposition", "inline");
  // res.sendFile(filePath);
  
});



export default router;