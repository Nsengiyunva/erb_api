import express from "express";
import dotenv from "dotenv";
import engineers_routes  from "./routes/engineer_routes"
import auth_routes  from "./routes/authRoutes"
import { sequelize, connectDB } from "./config/database";
import {  authenticate } from './middleware/authenticate'
import cors from "cors";

import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8877;
app.use(cors({
    origin: [
      "http://localhost:3001",
      "http://localhost:3000",
      "https://data.erb.go.ug",
      "https://sit.erb.go.ug"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }));
   
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const uploadDir = path.join(process.cwd(), "/var/ugpass/destination");

function findFileByRegistration(regNo: any) {
  const files = fs.readdirSync(uploadDir);
  return files.find(file => file.includes(`_${regNo}`));
}

app.get("/files/display/:registrationNo", authenticate, async (req, res) => {
  const { registrationNo } = req.params;

  const filename = findFileByRegistration(registrationNo);
  if (!filename) {
    return res.status(404).json({ message: "File not found" });
  }

  const safeFile = path.basename(filename);
  const filePath = path.join(uploadDir, safeFile);

  res.setHeader("Content-Disposition", "inline");
  res.sendFile(filePath);
});


app.use( "/api/engineers", engineers_routes )
app.use( "/api/auth/engineers", auth_routes )


connectDB();
sequelize.sync().then(() => console.log("Tables synced..."));

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
