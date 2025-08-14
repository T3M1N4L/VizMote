(() => {
    const logsEl = document.getElementById('logs');
    const ipBadge = document.getElementById('ip-badge');
    const pairingPanel = document.getElementById('pairing-panel');
    const remotePanel = document.getElementById('remote-panel');
    const pairIp = document.getElementById('pair-ip');
    const pairPin = document.getElementById('pair-pin');
    const pairingPinRow = document.getElementById('pairing-pin-row');
    const pairingMsg = document.getElementById('pairing-msg');

    function elShow(el) {
        if (el) el.classList.remove('hidden');
    }

    function elHide(el) {
        if (el) el.classList.add('hidden');
    }

    function showRemote() {
        elHide(pairingPanel);
        elShow(remotePanel);
    }

    function showPairing() {
        elShow(pairingPanel);
        elHide(remotePanel);
    }

    function setIpBadge(ip) {
        if (ipBadge) ipBadge.textContent = 'IP: ' + (ip || '-');
    }

    function setPairingMsg(text, type = 'info') {
        if (!pairingMsg) return;
        pairingMsg.className = 'log ' + (type === 'ok' ? 'log-ok' : type === 'err' ? 'log-err' : type === 'warn' ? 'log-warn' : '');
        pairingMsg.textContent = text || '';
    }

    async function pairStart() {
        const ip = (pairIp && pairIp.value || '').trim();
        if (!ip) {
            setPairingMsg('Please enter your TV IP address.', 'warn');
            return;
        }
        try {
            setPairingMsg('Starting pairing...');
            await post('/api/pair/initiate', {
                body: {
                    ip
                }
            });
            setPairingMsg('Pairing initiated. Enter the PIN shown on your TV and click Submit PIN.', 'ok');
            elShow(pairingPinRow);
            pairPin && pairPin.focus();
        } catch (e) {
            setPairingMsg('Pairing failed: ' + e.message, 'err');
            elHide(pairingPinRow);
        }
    }

    async function pairCommit() {
        const pin = (pairPin && pairPin.value || '').trim();
        if (!pin) {
            setPairingMsg('Enter the PIN from your TV.', 'warn');
            return;
        }
        try {
            setPairingMsg('Submitting PIN...');
            const data = await post('/api/pair/commit', {
                body: {
                    pin
                }
            });
            setPairingMsg('Paired successfully!', 'ok');
            setIpBadge(data.ip);
            log('Paired successfully with TV at ' + data.ip, 'ok');
            showRemote();
        } catch (e) {
            setPairingMsg('PIN submission failed: ' + e.message, 'err');
        }
    }

    function bindPairing() {
        const btnStart = document.getElementById('btn-pair-start');
        const btnCommit = document.getElementById('btn-pair-commit');
        if (btnStart) btnStart.addEventListener('click', preventSpam(pairStart));
        if (btnCommit) btnCommit.addEventListener('click', preventSpam(pairCommit));
    }

    function time() {
        const d = new Date();
        return d.toLocaleTimeString();
    }

    function log(message, type = 'info') {
        const line = document.createElement('div');
        line.className = `log log-${type}`;
        line.textContent = `[${time()}] ${message}`;
        logsEl.appendChild(line);
        logsEl.scrollTop = logsEl.scrollHeight;
    }

    async function post(path, opts = {}) {
        try {
            const res = await fetch(path, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: opts.body ? JSON.stringify(opts.body) : undefined
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.ok === false) {
                const err = (data && (data.error || data.message)) || `HTTP ${res.status}`;
                throw new Error(err);
            }
            return data;
        } catch (e) {
            throw e;
        }
    }

    function bindButton(id, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', handler);
    }

    function preventSpam(fn, delay = 150) {
        let busy = false;
        return async (...args) => {
            if (busy) return;
            busy = true;
            try {
                await fn(...args);
            } finally {
                setTimeout(() => (busy = false), delay);
            }
        };
    }

    const actions = {

        up: () => post('/api/nav/up').then(() => log('Navigate Up', 'ok')).catch(e => log(`Up failed: ${e.message}`, 'err')),
        down: () => post('/api/nav/down').then(() => log('Navigate Down', 'ok')).catch(e => log(`Down failed: ${e.message}`, 'err')),
        left: () => post('/api/nav/left').then(() => log('Navigate Left', 'ok')).catch(e => log(`Left failed: ${e.message}`, 'err')),
        right: () => post('/api/nav/right').then(() => log('Navigate Right', 'ok')).catch(e => log(`Right failed: ${e.message}`, 'err')),
        ok: () => post('/api/nav/ok').then(() => log('OK / Select', 'ok')).catch(e => log(`OK failed: ${e.message}`, 'err')),
        back: () => post('/api/nav/back').then(() => log('Back', 'ok')).catch(e => log(`Back failed: ${e.message}`, 'err')),

        menu: () => post('/api/menu').then(() => log('Settings', 'ok')).catch(e => log(`Settings failed: ${e.message}`, 'err')),
        home: () => post('/api/home').then(() => log('Home', 'ok')).catch(e => log(`Home failed: ${e.message}`, 'err')),
        input: () => post('/api/input/cycle').then(() => log('Input cycle', 'ok')).catch(e => log(`Input failed: ${e.message}`, 'err')),
        info: async () => {
            try {
                const res = await fetch('/api/info');
                const data = await res.json();
                if (!res.ok || data.ok === false) throw new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
                log('Info:', 'ok');
                const pretty = JSON.stringify(data.info, null, 2).split('\n');
                for (const line of pretty.slice(0, 50)) log(line);
                if (pretty.length > 50) log('…', 'info');
            } catch (e) {
                log(`Info failed: ${e.message}`, 'err');
            }
        },

        volUp: () => post('/api/volume/up').then(() => log('Volume Up', 'ok')).catch(e => log(`Vol+ failed: ${e.message}`, 'err')),
        volDown: () => post('/api/volume/down').then(() => log('Volume Down', 'ok')).catch(e => log(`Vol- failed: ${e.message}`, 'err')),

        powerOn: () => post('/api/power/on').then(() => log('Power On', 'ok')).catch(e => log(`Power On failed: ${e.message}`, 'err')),
        powerOff: () => post('/api/power/off').then(() => log('Power Off', 'ok')).catch(e => log(`Power Off failed: ${e.message}`, 'err')),

        youtube: () => post('/api/app/youtube').then(() => log('Launch: YouTube', 'ok')).catch(e => log(`YouTube failed: ${e.message}`, 'err')),
        hulu: () => post('/api/app/hulu').then(() => log('Launch: Hulu', 'ok')).catch(e => log(`Hulu failed: ${e.message}`, 'err')),
        netflix: () => post('/api/app/netflix').then(() => log('Launch: Netflix', 'ok')).catch(e => log(`Netflix failed: ${e.message}`, 'err')),
        plex: () => post('/api/app/plex').then(() => log('Launch: Plex', 'ok')).catch(e => log(`Plex failed: ${e.message}`, 'err')),
        disney: () => post('/api/app/disney').then(() => log('Launch: Disney+', 'ok')).catch(e => log(`Disney+ failed: ${e.message}`, 'err')),
        tubi: () => post('/api/app/tubi').then(() => log('Launch: Tubi', 'ok')).catch(e => log(`Tubi failed: ${e.message}`, 'err')),
    };

    function bindControls() {
        bindButton('btn-up', preventSpam(actions.up));
        bindButton('btn-down', preventSpam(actions.down));
        bindButton('btn-left', preventSpam(actions.left));
        bindButton('btn-right', preventSpam(actions.right));
        bindButton('btn-ok', preventSpam(actions.ok));
        bindButton('btn-back', preventSpam(actions.back));
        bindButton('btn-menu', preventSpam(actions.menu));
        bindButton('btn-home', preventSpam(actions.home));
        bindButton('btn-input', preventSpam(actions.input));
        bindButton('btn-info', preventSpam(actions.info));
        bindButton('btn-vol-up', preventSpam(actions.volUp));
        bindButton('btn-vol-down', preventSpam(actions.volDown));
        bindButton('btn-power-on', preventSpam(actions.powerOn, 400));
        bindButton('btn-power-off', preventSpam(actions.powerOff, 400));

        bindButton('app-youtube', preventSpam(actions.youtube, 400));
        bindButton('app-hulu', preventSpam(actions.hulu, 400));
        bindButton('app-netflix', preventSpam(actions.netflix, 400));
        bindButton('app-plex', preventSpam(actions.plex, 400));
        bindButton('app-disney', preventSpam(actions.disney, 400));
        bindButton('app-tubi', preventSpam(actions.tubi, 400));
    }

    function bindKeyboard() {
        window.addEventListener('keydown', (e) => {

            if (e.repeat) return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    actions.up();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    actions.down();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    actions.left();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    actions.right();
                    break;
                case ' ':
                    e.preventDefault();
                    actions.ok();
                    break;
                case 'x':
                case 'X':
                    actions.back();
                    break;
                case 'Escape':
                    actions.menu();
                    break;
                case 'h':
                case 'H':
                    actions.home();
                    break;
                case 's':
                case 'S':
                    actions.input();
                    break;
                case 'i':
                case 'I':
                    actions.info();
                    break;
                case '+':
                case '=':
                    actions.volUp();
                    break;
                case '-':
                    actions.volDown();
                    break;
                case 'p':
                    actions.powerOn();
                    break;
                case 'P':
                    if (e.shiftKey) actions.powerOff();
                    else actions.powerOn();
                    break;
                default:

                    if (e.code === 'NumpadAdd') actions.volUp();
                    if (e.code === 'NumpadSubtract') actions.volDown();
                    break;
            }
        });
    }

    async function init() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            if (data && data.ok) {
                if (data.paired) {
                    setIpBadge(data.ip);
                    showRemote();
                    log(`Connected to Vizio TV at ${data.ip}`, 'ok');
                } else {
                    showPairing();
                    if (data.hasConfig && data.ip) setIpBadge(data.ip);
                    log('Not paired. Enter your TV IP to start pairing.', 'warn');
                }
            } else {
                log('Status did not return expected response', 'warn');
            }
        } catch (e) {
            log(`Unable to reach backend: ${e.message}`, 'err');
        }

        log('Tip: Use arrow keys to navigate and Space for OK.', 'info');
    }

    bindControls();
    bindKeyboard();
    bindPairing();
    init();
})();