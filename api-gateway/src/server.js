import "dotenv/config";
import express from "express";

const app = express();
const port = Number(process.env.GATEWAY_PORT || 4000);
const backendBaseUrl = (process.env.BACKEND_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
});

app.use(express.json());

app.get("/health", (_req, res) => {
  return res.json({ ok: true, service: "api-gateway" });
});

async function proxyToBackend(req, res, targetPath) {
  try {
    const response = await fetch(`${backendBaseUrl}${targetPath}`, {
      method: req.method,
      headers: {
        "content-type": "application/json",
        authorization: req.headers.authorization || "",
      },
      body: req.method === "GET" ? undefined : JSON.stringify(req.body ?? {}),
    });

    const text = await response.text();
    let payload = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text };
      }
    }

    return res.status(response.status).json(payload);
  } catch (error) {
    console.error("Gateway error:", error);
    return res.status(502).json({
      error: "Failed to reach backend service",
    });
  }
}

app.post("/gateway/auth/register", async (req, res) => {
  return proxyToBackend(req, res, "/api/auth/register");
});

app.post("/gateway/auth/login", async (req, res) => {
  return proxyToBackend(req, res, "/api/auth/login");
});

app.post("/gateway/auth/logout", async (req, res) => {
  return proxyToBackend(req, res, "/api/auth/logout");
});

app.post("/gateway/checkin", async (req, res) => {
  return proxyToBackend(req, res, "/api/checkin");
});

app.post("/gateway/checkout", async (req, res) => {
  return proxyToBackend(req, res, "/api/checkout");
});

app.get("/gateway/status", async (req, res) => {
  return proxyToBackend(req, res, "/api/status");
});

app.use((err, _req, res, _next) => {
  console.error(err);
  return res.status(500).json({ error: "Internal gateway server error" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`API gateway listening on http://0.0.0.0:${port}`);
  console.log(`Proxying backend at ${backendBaseUrl}`);
});
