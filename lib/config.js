"use strict";

const fs = require("fs");
const path = require("path");

const CONFIG_FILENAME = "vizio-config.json";

function configPath() {
  return path.resolve(__dirname, "..", CONFIG_FILENAME);
}

function loadConfig() {
  try {
    const p = configPath();
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    if (!data.ip || !data.token) return null;
    return {
      ip: String(data.ip),
      token: String(data.token),
    };
  } catch {
    return null;
  }
}

function saveConfig(ip, token) {
  const p = configPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir))
    fs.mkdirSync(dir, {
      recursive: true,
    });
  const content = {
    ip,
    token,
  };
  fs.writeFileSync(p, JSON.stringify(content, null, 2), "utf8");
  return p;
}

function hasConfig() {
  return !!loadConfig();
}

function maskToken(token) {
  if (!token) return "";
  if (token.length <= 4) return "●".repeat(token.length);
  return (
    token.slice(0, 2) +
    "●".repeat(Math.max(0, token.length - 4)) +
    token.slice(-2)
  );
}

function resolveInitialConfigFromEnv() {
  const ip = process.env.VIZIO_IP;
  const token = process.env.VIZIO_TOKEN;
  if (ip && token)
    return {
      ip,
      token,
    };
  return null;
}

function ensureConfigFromEnvIfPresent() {
  const envCfg = resolveInitialConfigFromEnv();
  if (envCfg) {
    const existing = loadConfig();
    if (
      !existing ||
      existing.ip !== envCfg.ip ||
      existing.token !== envCfg.token
    ) {
      saveConfig(envCfg.ip, envCfg.token);
    }
    return envCfg;
  }
  return loadConfig();
}

module.exports = {
  configPath,
  loadConfig,
  saveConfig,
  hasConfig,
  maskToken,
  ensureConfigFromEnvIfPresent,
};
