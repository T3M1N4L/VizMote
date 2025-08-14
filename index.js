#!/usr/bin/env node

"use strict";

const VizioSmartCast = require("vizio-smart-cast");
const blessed = require("blessed");
const readline = require("readline");
const {
  ensureConfigFromEnvIfPresent,
  loadConfig,
  saveConfig,
  maskToken,
} = require("./lib/config");

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function pairOnceInteractive() {
  console.log("No saved Vizio config found.");
  const ip = (await ask("Enter the IP address of your display: ")).trim();
  if (!ip) {
    console.error("IP is required.");
    process.exit(1);
  }

  const temp = new VizioSmartCast(ip);
  try {
    await temp.pairing.initiate("VizMote", "9727");
  } catch (e) {
    console.error(
      `Failed to initiate pairing at ${ip}: ${e && e.message ? e.message : e}`,
    );
    process.exit(1);
  }

  const pin = (await ask("Enter the PIN shown on your display: ")).trim();
  if (!pin) {
    console.error("PIN is required.");
    process.exit(1);
  }

  try {
    const response = await temp.pairing.pair(pin);
    const token = response && response.ITEM && response.ITEM.AUTH_TOKEN;
    if (!token) {
      console.error("Pairing did not return an auth token.");
      process.exit(1);
    }
    saveConfig(ip, token);
    console.log("Your display is paired! Token saved to vizio-config.json.");
    return {
      ip,
      token,
    };
  } catch (e) {
    console.error(
      `Failed to complete pairing: ${e && e.message ? e.message : e}`,
    );
    process.exit(1);
  }
}

async function main() {
  let cfg = ensureConfigFromEnvIfPresent() || loadConfig();
  if (!cfg) {
    cfg = await pairOnceInteractive();
  }

  const TV_IP = cfg.ip;
  const AUTH_TOKEN = cfg.token;

  const tv = new VizioSmartCast(TV_IP);
  tv.pairing.useAuthToken(AUTH_TOKEN);

  const screen = blessed.screen({
    smartCSR: true,
    title: "Vizio SmartCast - TUI",
  });

  const header = blessed.box({
    top: 0,
    left: 0,
    width: "100%",
    height: 3,
    tags: true,
    style: {
      fg: "white",
      bg: "blue",
    },
    content: `  {bold}Vizio SmartCast{/bold}  |  IP: ${TV_IP}  |  Token: ${AUTH_TOKEN ? maskToken(AUTH_TOKEN) : "none"}`,
  });

  const helpBoxHeight = 15;

  const helpBox = blessed.box({
    top: 3,
    left: 0,
    width: "60%",
    height: helpBoxHeight,
    tags: false,
    border: "line",
    label: " Remote Keys ",
    style: {
      border: {
        fg: "gray",
      },
    },
    content: `+----------------------- Remote ------------------------+
| Power [P]                                    [S] Input|
|                                                       |
|                [H] Home     [I] Info                  |
|                                                       |
|                       ▲ [Up]                          |
|          ◀ [Left]    [Space] OK    ▶ [Right]          |
|                       ▼ [Down]                        |
|                                                       |
| Settings [esc]                            Vol + [+]   |
| Back [X]                                  Vol - [-]   |
|                                                       |
| Quit TUI [Q]                                          |
+-------------------------------------------------------+`,
  });

  const logBox = blessed.log({
    top: 3,
    left: "60%",
    right: 0,
    bottom: 1,
    tags: true,
    border: "line",
    label: " Logs ",
    keys: true,
    mouse: true,
    scrollback: 1000,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      inverse: true,
    },
    style: {
      border: {
        fg: "gray",
      },
      scrollbar: {
        bg: "gray",
      },
    },
  });

  const footer = blessed.box({
    bottom: 0,
    left: 0,
    width: "100%",
    height: 1,
    tags: true,
    style: {
      fg: "black",
      bg: "purple",
    },
    content:
      " Apps: [1] YouTube  [2] Hulu  [3] Netflix  [4] Plex  [5] Disney+  [6] Tubi ",
  });

  screen.append(header);
  screen.append(helpBox);
  screen.append(logBox);
  screen.append(footer);

  function renderHeader() {
    header.setContent(
      `  {bold}Vizio SmartCast{/bold}  |  IP: ${TV_IP}  |  Token: ${AUTH_TOKEN ? maskToken(AUTH_TOKEN) : "none"}`,
    );
  }

  function logInfo(msg) {
    logBox.log(`{white-fg}${msg}{/}`);
  }

  function logSuccess(msg) {
    logBox.log(`{green-fg}${msg}{/}`);
  }

  function logWarn(msg) {
    logBox.log(`{yellow-fg}${msg}{/}`);
  }

  function logError(msg) {
    logBox.log(`{red-fg}${msg}{/}`);
  }

  async function safeCall(desc, fn) {
    try {
      logInfo(`→ ${desc}...`);
      await fn();
      logSuccess(`✓ ${desc}`);
    } catch (e) {
      logError(`✗ ${desc} failed: ${e && e.message ? e.message : e}`);
    } finally {
      screen.render();
    }
  }

  let powerOn = null;

  renderHeader();
  logSuccess(`Ready. Using saved config (IP ${TV_IP}).`);
  logInfo("Press Q to quit the TUI.");
  logInfo("Tip: Use the arrow keys to navigate and space to select.");
  screen.render();

  safeCall("Fetching device info", async () => {
    const info = await tv.control.info();
    try {
      const summary =
        typeof info === "object"
          ? JSON.stringify(info).slice(0, 300)
          : String(info);
      logInfo(`Info: ${summary}${summary.length >= 300 ? "…" : ""}`);
    } catch {}
  });

  screen.key(["up"], () => {
    safeCall("Navigate Up", () => tv.control.navigate.up());
  });
  screen.key(["down"], () => {
    safeCall("Navigate Down", () => tv.control.navigate.down());
  });
  screen.key(["left"], () => {
    safeCall("Navigate Left", () => tv.control.navigate.left());
  });
  screen.key(["right"], () => {
    safeCall("Navigate Right", () => tv.control.navigate.right());
  });
  screen.key(["space"], () => {
    safeCall("OK / Select", () => tv.control.navigate.ok());
  });
  screen.key(["x"], () => {
    safeCall("Back", () => tv.control.navigate.back());
  });
  screen.key(["escape", "esc"], () => {
    safeCall("Settings", () => tv.control.menu());
  });
  screen.key(["+", "="], () => {
    safeCall("Volume Up", () => tv.control.volume.up());
  });
  screen.key(["-"], () => {
    safeCall("Volume Down", () => tv.control.volume.down());
  });

  screen.key(["p", "P"], () => {
    if (powerOn === true) {
      powerOn = false;
      safeCall("Power Off", () => tv.control.power.off());
    } else {
      powerOn = true;
      safeCall("Power On", () => tv.control.power.on());
    }
  });
  screen.key(["i", "I"], () => {
    safeCall("Info", async () => {
      const info = await tv.control.info();
      try {
        const pretty =
          typeof info === "object"
            ? JSON.stringify(info, null, 2)
            : String(info);
        pretty.split("\n").forEach((line) => logInfo(line));
      } catch {
        logInfo(String(info));
      }
    });
  });

  screen.key(["1"], () => {
    safeCall("Youtube", () => tv.app.launch("", "1", 5));
  });
  screen.key(["2"], () => {
    safeCall("Hulu", () => tv.app.launch("", "3", 2));
  });
  screen.key(["3"], () => {
    safeCall("Netflix", () => tv.app.launch("", "1", 3));
  });
  screen.key(["4"], () => {
    safeCall("Plex", () => tv.app.launch("", "9", 2));
  });
  screen.key(["5"], () => {
    safeCall("Disney+", () => tv.app.launch("", "75", 2));
  });
  screen.key(["6"], () => {
    safeCall("Tubi", () => tv.app.launch("", "61", 2));
  });

  screen.key(["h", "H"], () => {
    safeCall("Home", () => tv.app.launch("", "1", 4));
  });

  screen.key(["s", "S"], () => {
    safeCall("Input", () => tv.control.input.cycle());
  });

  screen.key(["q", "Q", "C-c"], () => {
    logWarn("Quitting...");
    screen.render();
    screen.destroy();
    process.exit(0);
  });

  screen.on("resize", () => {
    renderHeader();
    screen.render();
  });
}

main().catch((e) => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});
