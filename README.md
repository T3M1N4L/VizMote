<h1 align="center">
  <br>
  <br>
  VizMote
  <br>
</h1>

<h4 align="center">Control your Vizio TV  through a website, or terminal.</h4>

VizMote provides both a Terminal UI (TUI) and a Web UI for controlling your Vizio SmartCast TV.  
After a one-time pairing, your TV’s IP address and authentication token are saved locally for instant reconnection.

---

## Features
- **Dual Interface** — Choose between a Terminal-based UI or Web-based UI.
- **One-Time Pairing** — Automatically saves IP and auth token for future sessions.
- **Seamless Control** — Power, volume, input switching, and more.
- **Local Storage** — No cloud dependency; your data stays on your device.
- **No Ads** — Wanna break from the ads from the thousands of remote apps on the app store/play store?
---

## Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/T3M1N4L/VizMote.git
cd vizmote
npm install
```

---

## Usage
1. Find the IP Adress of your TV
    > To configure this package, the IP address of the device must be known. This can be found with either the SmartCast app or on the device menu.
2. On your device which you have cloned VizMote to, either launch the TUI (Terminal UI), or the WebUI (preferred). Commands to start either have been listed below

### Launch TUI
```bash
npm run start:tui
```

### Launch Web UI
```bash
npm run start:web
```
The Web UI will start a local server and show the URL in your terminal.

3. Enter the IP of the TV if this is your first time (ex. `10.0.0.193`)

4. It should start pairing and on your tv, you should get a pairing code, enter that into VizMote UI (ex. `8612`)

5. You should see a popup on your TV saying that "VizMote has succesfully connected"

6. Now you can control your TV!
---

## Configuration
After pairing, your TV’s IP and auth token are stored in `config.json` in the project directory.  
You can edit or delete this file to reset pairing.

---

## Requirements
- Node.js 18+  
- A Vizio SmartCast TV on the same network  
- Network access between your device and the TV

---
## How it Works
`VizMote` would only have been possible thanks to the npm package [`vizio-smart-cast`](https://github.com/heathbar/vizio-smart-cast/blob/master/README.md) by [Heath Paddock](https://github.com/heathbar). Many thanks to him for his excellent work.

## License
[MIT License](LICENSE) © 2025 T3M1N4L
