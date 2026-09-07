import "dotenv/config";
import express from "express";
import engineers_routes from "./routes/engineer_routes";
import auth_routes from "./routes/authRoutes";
import { connectDB } from "./config/database";
import filesRoutes from "./routes/files.routes";
import cors from "cors";
import client from "prom-client";
import userRoutes from "./routes/user.routes";

const app = express();
const PORT = process.env.PORT || 8877;

app.use(
  cors({
    origin: [
      "http://localhost:3001",
      "http://localhost:3000",
      "https://data.erb.go.ug",
      "https://sit.erb.go.ug",
      "https://registration.erb.go.ug",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static("/home/user1/uploads"));

app.use((req, res, next) => {
  req.setTimeout(60000);
  res.setTimeout(60000);
  next();
});

// ─── Prometheus setup ────────────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// Active connections gauge
const activeConnections = new client.Gauge({
  name: "http_active_connections",
  help: "Number of active HTTP connections",
  registers: [register],
});

// Request counter (for total requests stat panel)
const httpRequestTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

// Middleware — place this BEFORE your routes
app.use((req, res, next) => {
  // Skip metrics endpoint itself to avoid noise
  if (req.path === "/metrics") return next();

  const end = httpRequestDuration.startTimer();
  activeConnections.inc();

  // res.on("finish", () => {
  //   const route = req.route?.path || req.path;
  //   const labels = {
  //     method: req.method,
  //     route,
  //     status_code: res.statusCode,
  //   };
  //   end(labels);
  //   httpRequestTotal.inc(labels);
  //   activeConnections.dec();
  // });
  res.on("finish", () => {
    const route = req.route?.path
      ? (req.baseUrl || "") + req.route.path
      : "unmatched";

    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };
    end(labels);
    httpRequestTotal.inc(labels);
    activeConnections.dec();
  });

  next();
});


app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use("/api/engineers", engineers_routes);
app.use("/api/auth/engineers", auth_routes);
app.use("/api/files", filesRoutes);
app.use("/old/users", userRoutes);

connectDB();
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
