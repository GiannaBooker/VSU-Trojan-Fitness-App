import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { accessDb, mutateDb } from "../src/storage.js";
import { getOccupancySnapshot, setMaxCapacity } from "../src/services/occupancy.js";
import { addEquipment, getEquipmentHistory, listEquipment, setEquipmentStatus } from "../src/services/equipment.js";

process.env.DB_PATH ||= "./data/demo-db.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, "..", "demo-images");

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderJsonBlock({ x, y, title, subtitle, obj, width = 1120 }) {
  const json = JSON.stringify(obj, null, 2);
  const lines = json.split("\n");
  const lineHeight = 18;
  const padding = 18;
  const headerHeight = 58;
  const height = headerHeight + padding + lines.length * lineHeight + padding;

  const textX = x + padding;
  const textY = y + 40;
  const jsonY = y + headerHeight + padding;

  const tspans = lines
    .map((line, idx) => {
      const dy = idx === 0 ? 0 : lineHeight;
      return `<tspan x="${textX}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  return {
    height,
    svg: `
  <g>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="#0b1220" stroke="#24304a"/>
    <text x="${textX}" y="${textY}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="18" fill="#e5e7eb">${escapeXml(title)}</text>
    <text x="${textX}" y="${textY + 22}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="13" fill="#94a3b8">${escapeXml(subtitle)}</text>
    <rect x="${x + padding}" y="${y + headerHeight}" width="${width - padding * 2}" height="${height - headerHeight - padding}" rx="10" fill="#0a0f1a" stroke="#1f2937"/>
    <text x="${textX}" y="${jsonY}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" font-size="13" fill="#d1d5db">
      ${tspans}
    </text>
  </g>`,
  };
}

function wrapSvg({ title, blocks }) {
  const width = 1200;
  const margin = 40;
  const gap = 26;
  let y = 100;
  const rendered = [];

  for (const block of blocks) {
    const r = renderJsonBlock({ x: margin, y, ...block, width: width - margin * 2 });
    rendered.push(r.svg);
    y += r.height + gap;
  }

  const height = y + 20;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#050814"/>
  <text x="${margin}" y="56" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="26" fill="#f8fafc">${escapeXml(title)}</text>
  <text x="${margin}" y="78" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="13" fill="#94a3b8">Generated locally from backend services using a demo DB (no HTTP server).</text>
  ${rendered.join("\n")}
</svg>`;
}

await fs.mkdir(outDir, { recursive: true });

const nowIso = new Date().toISOString();

const demo = await mutateDb((db) => {
  db.users = [];
  db.sessions = [];
  db.revokedTokens = [];
  db.occupancy = { maxCapacity: null };
  db.equipment = [];
  db.equipmentStatuses = {};
  db.equipmentEvents = [];

  setMaxCapacity(db, 50);

  const mkSession = ({ hoursAgo, checkedOut }) => {
    const checkInAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
    return {
      id: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      checkInAt,
      checkOutAt: checkedOut ? nowIso : null,
      checkOutReason: checkedOut ? "user" : null,
    };
  };

  db.sessions.push(mkSession({ hoursAgo: 0.4, checkedOut: false }));
  db.sessions.push(mkSession({ hoursAgo: 1.1, checkedOut: false }));
  db.sessions.push(mkSession({ hoursAgo: 2.0, checkedOut: true }));

  const createdAt = nowIso;
  const treadmill = addEquipment(db, { name: "Treadmill #1", area: "Cardio", createdAt });
  const rack = addEquipment(db, { name: "Squat Rack A", area: "Strength", createdAt });

  const statusEvent = setEquipmentStatus(db, {
    equipmentId: treadmill.id,
    status: "in_use",
    updatedAt: nowIso,
    updatedByUserId: "demo-user",
    note: "Busy hour",
  });

  const equipmentList = listEquipment(db);
  const history = getEquipmentHistory(db, treadmill.id, { limit: 25 });

  return { treadmillId: treadmill.id, rackId: rack.id, statusEvent, equipmentList, history };
});

const occupancy = await accessDb((db) => ({
  ...getOccupancySnapshot(db),
  asOf: nowIso,
}));

const equipmentList = await accessDb((db) => ({ equipment: listEquipment(db) }));
const treadmillHistory = await accessDb((db) => {
  const events = getEquipmentHistory(db, demo.treadmillId, { limit: 25 });
  return { equipmentId: demo.treadmillId, events };
});

const occupancySvg = wrapSvg({
  title: "Occupancy API (Demo Output)",
  blocks: [
    {
      title: "GET /api/occupancy",
      subtitle: "Computed from sessions where checkOutAt is null",
      obj: occupancy,
    },
  ],
});

const equipmentSvg = wrapSvg({
  title: "Equipment Availability API (Demo Output)",
  blocks: [
    {
      title: "GET /api/equipment",
      subtitle: "List equipment with current status",
      obj: equipmentList,
    },
    {
      title: `GET /api/equipment/${demo.treadmillId}/history?limit=25`,
      subtitle: "Event history for a single piece of equipment",
      obj: treadmillHistory,
    },
  ],
});

await fs.writeFile(path.join(outDir, "occupancy-demo.svg"), occupancySvg, "utf8");
await fs.writeFile(path.join(outDir, "equipment-demo.svg"), equipmentSvg, "utf8");

console.log("Wrote demo images:");
console.log(path.join(outDir, "occupancy-demo.svg"));
console.log(path.join(outDir, "equipment-demo.svg"));
