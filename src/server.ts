import express from "express";
import dotenv from "dotenv";
import engineers_routes  from "./routes/engineer_routes"
import auth_routes  from "./routes/authRoutes"
import { sequelize, connectDB } from "./config/database";
import filesRoutes from "./routes/files.routes";
import cors from "cors";
import client from 'prom-client'

import fs from "fs";
import path from "path";
import userRoutes from "./routes/user.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8877;
app.use(cors({
    origin: [
      "http://localhost:3001",
      "http://localhost:3000",
      "https://data.erb.go.ug",
      "https://sit.erb.go.ug",
      "https://registration.erb.go.ug"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }));
   
app.use(express.json());
app.use("/uploads", express.static("uploads"));
// }));

// Increase server timeout (if using Express)
app.use((req, res, next) => {
  req.setTimeout(60000); // 60 seconds
  res.setTimeout(60000); // 60 seconds
  next();
});


const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics(); // CPU, memory, event loop, etc.


const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

// Middleware to track every request
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ 
      method: req.method, 
      route: req.path, 
      status_code: res.statusCode 
    });
  });
  next();
});

// Expose the /metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});



app.use( "/api/engineers", engineers_routes )
app.use( "/api/auth/engineers", auth_routes )
app.use("/api/files", filesRoutes);
app.use('/old/users', userRoutes);


//metrics


connectDB();
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
