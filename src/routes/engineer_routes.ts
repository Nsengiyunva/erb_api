import { Router } from "express";
import fs from "fs";
import path from "path";
// import { authenticate } from "../middleware/authenticate";
import { uploadCSV } from "../middleware/uploadCSV";
import { importEngineersFromCsv, checkhealth, importPaidList,  getAllPaidRecords,
    getPaidRecordById,
    updateERBPaid, insertEngineers, addEngineer, 
    insertPaidRecord} from "../controllers/engineer_controller";

import { updateUser } from '../controllers/old_user_controller';

const router = Router();

const FILE_DIR = "/var/ugpass/destination";

//importr engineers
router.post("/import-csv", uploadCSV, importEngineersFromCsv);

//import paid csv
router.post( "/pull-paid-list", uploadCSV, importPaidList);

router.post( "/add-engineers", insertEngineers);

router.post( "/engineer", addEngineer );

router.post( "/addpaid", insertPaidRecord);



router.get( "/checkhealth", checkhealth );
router.get("/paid-records", getAllPaidRecords);
router.get("/paid-records/:id", getPaidRecordById);

router.put("/:id", updateERBPaid);

//update user
router.put('/users/:id', updateUser);



//get the files 
router.get("/display/:registrationNo", async (req, res) => {
  try {
    const { registrationNo } = req.params;

    const filePath = path.join(
      FILE_DIR,
      `${registrationNo}.pdf`
    );

    await fs.promises.access(filePath);

    const stat = await fs.promises.stat(filePath);
    const range = req.headers.range;

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stat.size - 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Accept-Ranges": "bytes",
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    return res.status(404).json({ message: "File not found" });
  }
});





export default router;