"use strict";

const path = require("path");
const express = require("express");
const cors = require("cors");
const VizioSmartCast = require("vizio-smart-cast");
const {
  ensureConfigFromEnvIfPresent,
  loadConfig,
  saveConfig,
} = require("../lib/config");

const PORT = parseInt(process.env.PORT || "3000", 10);

let tv = null;
let currentIp = null;
let pending = {
  tv: null,
  ip: null,
};

function initFromConfig() {
  const cfg = ensureConfigFromEnvIfPresent() || loadConfig();
  if (cfg && cfg.ip && cfg.token) {
    currentIp = cfg.ip;
    tv = new VizioSmartCast(cfg.ip);
    tv.pairing.useAuthToken(cfg.token);
    return true;
  }
  return false;
}

initFromConfig();

const app = express();
app.use(cors());
app.use(express.json());

async function handle(res, desc, fn) {
  try {
    if (!tv) throw new Error("Not paired");
    await fn();
    res.json({
      ok: true,
      desc,
    });
  } catch (e) {
    res.status(String(e.message || e).includes("Not paired") ? 400 : 500).json({
      ok: false,
      desc,
      error: e && e.message ? e.message : String(e),
    });
  }
}

app.get("/api/status", (req, res) => {
  const cfg = loadConfig();
  res.json({
    ok: true,
    paired: !!tv,
    ip: currentIp || (cfg && cfg.ip) || null,
    hasConfig: !!cfg,
  });
});

app.post("/api/pair/initiate", async (req, res) => {
  try {
    const ip = String((req.body && req.body.ip) || "").trim();
    if (!ip)
      return res.status(400).json({
        ok: false,
        error: "IP is required",
      });
    if (tv)
      return res.status(400).json({
        ok: false,
        error: "Already paired",
      });

    pending.tv = new VizioSmartCast(ip);
    pending.ip = ip;

    await pending.tv.pairing.initiate("VizMote", "9727");
    res.json({
      ok: true,
      ip,
    });
  } catch (e) {
    pending = {
      tv: null,
      ip: null,
    };
    res.status(500).json({
      ok: false,
      error: e && e.message ? e.message : String(e),
    });
  }
});

app.post("/api/pair/commit", async (req, res) => {
  try {
    const pin = String((req.body && req.body.pin) || "").trim();
    if (!pin)
      return res.status(400).json({
        ok: false,
        error: "PIN is required",
      });
    if (!pending.tv || !pending.ip) {
      return res.status(400).json({
        ok: false,
        error: "No pairing session in progress",
      });
    }

    const response = await pending.tv.pairing.pair(pin);
    const token = response && response.ITEM && response.ITEM.AUTH_TOKEN;
    if (!token)
      return res.status(500).json({
        ok: false,
        error: "Pairing did not return an auth token",
      });

    saveConfig(pending.ip, token);
    currentIp = pending.ip;
    tv = new VizioSmartCast(currentIp);
    tv.pairing.useAuthToken(token);

    pending = {
      tv: null,
      ip: null,
    };

    res.json({
      ok: true,
      ip: currentIp,
    });
  } catch (e) {
    pending = {
      tv: null,
      ip: null,
    };
    res.status(500).json({
      ok: false,
      error: e && e.message ? e.message : String(e),
    });
  }
});

app.get("/api/ping", (req, res) =>
  res.json({
    ok: true,
    ip: currentIp || null,
  }),
);

app.get("/api/info", async (req, res) => {
  try {
    if (!tv)
      return res.status(400).json({
        ok: false,
        error: "Not paired",
      });
    const info = await tv.control.info();
    res.json({
      ok: true,
      info,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e && e.message ? e.message : String(e),
    });
  }
});

app.post("/api/nav/up", (req, res) =>
  handle(res, "Navigate Up", () => tv.control.navigate.up()),
);
app.post("/api/nav/down", (req, res) =>
  handle(res, "Navigate Down", () => tv.control.navigate.down()),
);
app.post("/api/nav/left", (req, res) =>
  handle(res, "Navigate Left", () => tv.control.navigate.left()),
);
app.post("/api/nav/right", (req, res) =>
  handle(res, "Navigate Right", () => tv.control.navigate.right()),
);
app.post("/api/nav/ok", (req, res) =>
  handle(res, "OK", () => tv.control.navigate.ok()),
);
app.post("/api/nav/back", (req, res) =>
  handle(res, "Back", () => tv.control.navigate.back()),
);

app.post("/api/menu", (req, res) =>
  handle(res, "Settings", () => tv.control.menu()),
);

app.post("/api/volume/up", (req, res) =>
  handle(res, "Volume Up", () => tv.control.volume.up()),
);
app.post("/api/volume/down", (req, res) =>
  handle(res, "Volume Down", () => tv.control.volume.down()),
);

app.post("/api/power/on", (req, res) =>
  handle(res, "Power On", () => tv.control.power.on()),
);
app.post("/api/power/off", (req, res) =>
  handle(res, "Power Off", () => tv.control.power.off()),
);

app.post("/api/input/cycle", (req, res) =>
  handle(res, "Input Cycle", () => tv.control.input.cycle()),
);

app.post("/api/home", (req, res) =>
  handle(res, "Home", () => tv.app.launch("", "1", 4)),
);
app.post("/api/app/youtube", (req, res) =>
  handle(res, "YouTube", () => tv.app.launch("", "1", 5)),
);
app.post("/api/app/hulu", (req, res) =>
  handle(res, "Hulu", () => tv.app.launch("", "3", 2)),
);
app.post("/api/app/netflix", (req, res) =>
  handle(res, "Netflix", () => tv.app.launch("", "1", 3)),
);
app.post("/api/app/plex", (req, res) =>
  handle(res, "Plex", () => tv.app.launch("", "9", 2)),
);
app.post("/api/app/disney", (req, res) =>
  handle(res, "Disney+", () => tv.app.launch("", "75", 2)),
);
app.post("/api/app/tubi", (req, res) =>
  handle(res, "Tubi", () => tv.app.launch("", "61", 2)),
);

app.use(
  "/vendor/lucide",
  express.static(path.join(__dirname, "..", "node_modules", "lucide")),
);

app.use("/", express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(
    `Web UI available at http://localhost:${PORT} ${tv ? `(paired, TV ${currentIp})` : "(not paired — open the Web UI to pair)"}`,
  );
});
