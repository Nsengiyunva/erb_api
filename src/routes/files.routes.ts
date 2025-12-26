import { Router } from "express";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/display/:registrationNo", authenticate, (req, res) => {
  res.send("File endpoint hit: " + req.params.registrationNo);
});

export default router;
