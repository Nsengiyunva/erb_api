import { RequestHandler, Router } from "express";
import fs from "fs";
import path from "path";
import { promises as fsPromises } from 'fs';
// import { authenticate } from "../middleware/authenticate";
import { uploadCSV } from "../middleware/uploadCSV";
import { importEngineersFromCsv, checkhealth, importPaidList,  getAllPaidRecords,
    getPaidRecordById,
    updateERBPaid, insertEngineers, addEngineer, 
    insertPaidRecord} from "../controllers/engineer_controller";

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


interface DisplayParams {
  registrationNo: string;
}

const displayPdf: RequestHandler<DisplayParams> = async (req, res) => {
  let stream: fs.ReadStream | null = null;

  try {
    const { registrationNo } = req.params;

    if (!registrationNo || !/^[a-zA-Z0-9_-]+$/.test(registrationNo)) {
      res.status(400).json({ message: "Invalid registration number" });
      return;
    }

    const filePath = path.join(FILE_DIR, `${registrationNo}.pdf`);

    const stat = await fsPromises.stat(filePath).catch((err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        res.status(404).json({ message: "File not found" });
        return null;
      }
      throw err;
    });

    if (!stat) return;

    res.status(200).set({
      "Content-Type": "application/pdf",
      "Content-Length": stat.size.toString(),
      "Content-Disposition": `attachment; filename="${registrationNo}.pdf"`,
      "Cache-Control": "no-store",
    });

    stream = fs.createReadStream(filePath);

    // Client disconnect
    req.on("close", () => {
      if (stream && !stream.destroyed) {
        stream.destroy();
      }
    });

    // Stream error
    stream.on("error", (err) => {
      console.error("PDF download stream error:", err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    stream.pipe(res);
  } catch (err) {
    console.error("PDF download handler error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

router.get("/display/:registrationNo", displayPdf);


export default router;