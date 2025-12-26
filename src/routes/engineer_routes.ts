import { Router } from "express";
import fs from "fs";
import path from "path";
// import { authenticate } from "../middleware/authenticate";
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



//get the files 
router.get("/display/:registrationNo", async (req, res) => {
  try {
    const { registrationNo } = req.params;

    const files = await fs.promises.readdir(FILE_DIR);

    const filename = files.find(file =>
      file.includes(`_${registrationNo}`)
    );

    if (!filename) {
      return res.status(404).json({ message: "File not found" });
    }

    const filePath = path.join(FILE_DIR, path.basename(filename));

    res.setHeader("Content-Disposition", "inline");

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on("error", () => {
      res.status(500).end("Error reading file");
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});




export default router;