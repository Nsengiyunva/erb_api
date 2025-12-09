import express from "express";
import dotenv from "dotenv";
import engineers_routes  from "./routes/engineer_routes"
import { sequelize, connectDB } from "./config/database";
import cors from "cors";
import listEndpoints from 'express-list-endpoints';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


// app.use("/api/auth", authRoutes);
// app.use("/api/farmers", farmerRoutes);
// app.use("/api/nfa", nfaMainRoutes);
app.use( "/api/engineers", engineers_routes )


connectDB();
sequelize.sync().then(() => console.log("Tables synced..."));

app.listen(process.env.PORT, () => console.log(`Server running on ${process.env.PORT}`));
