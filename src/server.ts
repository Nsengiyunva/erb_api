import express from "express";
import dotenv from "dotenv";
import engineers_routes  from "./routes/engineer_routes"
import { sequelize, connectDB } from "./config/database";
import cors from "cors";

dotenv.config();

const app = express();
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

app.use( "/api/engineers", engineers_routes )


connectDB();
sequelize.sync().then(() => console.log("Tables synced..."));

app.listen(process.env.PORT, () => console.log(`Server running on ${process.env.PORT}`));
