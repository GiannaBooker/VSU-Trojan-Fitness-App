import "dotenv/config";
import express from "express";
import { createAuthRouter } from "./routes/auth.js";
import { createCheckinRouter } from "./routes/checkin.js";
import { createOccupancyRouter } from "./routes/occupancy.js";
import { createEquipmentRouter } from "./routes/equipment.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createAdminMiddleware } from "./middleware/admin.js";
import { mutateDb } from "./storage.js";

const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET;
const adminKey = process.env.ADMIN_KEY || "";

if (!jwtSecret) {
  console.error("Missing JWT_SECRET (see backend/.env.example).");
  process.exit(1);
}

const app = express();

// Dev-friendly CORS (adjust as needed for production).
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type, x-admin-key");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
});

app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

const requireAuth = createAuthMiddleware({ jwtSecret });
const requireAdmin = createAdminMiddleware({ adminKey });

app.use("/api/auth", createAuthRouter({ jwtSecret }));

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  await mutateDb((db) => {
    db.revokedTokens.push({ jti: req.token.jti, exp: req.token.exp });
  });
  return res.json({ message: "Logged out" });
});

app.use("/api", createCheckinRouter({ requireAuth }));
app.use("/api", createOccupancyRouter({ requireAuth, requireAdmin }));
app.use("/api", createEquipmentRouter({ requireAuth, requireAdmin }));

app.use((err, _req, res, _next) => {
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

const host = process.env.HOST || "127.0.0.1";

app.listen(port, host, () => {
  console.log(`Backend listening on http://${host}:${port}`);
});
