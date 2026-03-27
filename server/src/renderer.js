const logArea = document.getElementById('log');
const serverInfo = document.getElementById('server-info');
const deviceCards = document.getElementById('device-cards');
const noDevices = document.getElementById('no-devices');

const deviceMap = new Map();

// --- i18n ---
const i18n = {
  en: {
    'section.devices': 'Devices',
    'section.log': 'Log',
    'btn.broadcast': 'Broadcast All',
    'btn.ref': 'Ref',
    'btn.clear': 'Clear',
    'no.devices': 'No devices connected',
    'card.label.motor': 'Motor',
    'card.label.switch': 'Switch / PWM',
    'card.label.mode': 'Mode',
    'card.steps': 'Steps',
    'card.dir': 'Dir',
    'card.speed': 'Speed (ms)',
    'card.move': 'Move',
    'card.stop': 'Stop',
    'card.status': 'Status',
    'card.goto': 'Goto (abs pos)',
    'card.goto.btn': 'Goto',
    'card.pin': 'Pin',
    'card.duty': 'Duty (0-255)',
    'card.freq': 'Freq (Hz)',
    'card.pwm': 'PWM',
    'card.mode.motor': 'Motor',
    'card.mode.gpio': 'GPIO',
    'ref.title': 'External Control Reference',
    'ref.rest.title': 'REST API',
    'ref.rest.note': 'HTTP POST to control devices from any language (p5.js, Python, etc.)',
    'ref.get.label': 'GET /api/devices — Device list',
    'ref.post.label': 'POST /api/command — Send command',
    'ref.deviceid.label': 'deviceId specification',
    'ref.deviceid.index': 'Device index (integer)',
    'ref.deviceid.ip': 'IP address',
    'ref.deviceid.all': 'Broadcast to all devices',
    'ref.p5.label': 'p5.js example',
    'ref.osc.title': 'OSC',
    'ref.osc.note': 'Send commands via UDP. Compatible with Pure Data, Max/MSP, TouchDesigner, etc.',
    'ref.osc.addr.label': 'Address patterns',
    'ref.pd.label': 'Pure Data example',
    'ref.osc.deviceid.label': 'deviceId (1st arg) specification',
    'ref.osc.id.num': 'Device index',
    'ref.osc.id.all': 'Broadcast',
    'ref.osc.id.omit.key': 'Omit',
    'ref.osc.id.omit': 'Broadcast',
    'ref.cmd.title': 'Command list',
    'ref.cmd.th.command': 'Command',
    'ref.cmd.th.params': 'Parameters',
    'ref.cmd.th.desc': 'Description',
    'ref.cmd.motor.move': 'direction: 1=CW, -1=CCW / speed: ms/step (min 5)',
    'ref.cmd.motor.goto': 'Move to absolute position. Delta calculated automatically.',
    'ref.cmd.motor.stop': 'Immediate stop',
    'ref.cmd.motor.status': 'Get current state',
    'ref.cmd.switch.set': 'value: 1=ON, 0=OFF',
    'ref.cmd.switch.pwm': 'duty: 0–255 / freq: Hz (5–10 recommended for SSR)',
    'ref.cmd.config.mode': '"motor" or "gpio" (session only)',
    'ref.pin.title': 'Pin mapping',
    'ref.pin.th.pin': 'pin',
    'ref.pin.th.gpio': 'GPIO',
    'ref.pin.th.motor': 'Motor mode',
    'ref.pin.th.gpio-mode': 'GPIO mode',
    'ref.pin.motor0': '✓ (fixed to GPIO16)',
  },
  ja: {
    'section.devices': 'デバイス',
    'section.log': 'ログ',
    'btn.broadcast': '全デバイスに送信',
    'btn.ref': 'リファレンス',
    'btn.clear': 'クリア',
    'no.devices': 'デバイスが接続されていません',
    'card.label.motor': 'モーター',
    'card.label.switch': 'スイッチ / PWM',
    'card.label.mode': 'モード',
    'card.steps': 'ステップ数',
    'card.dir': '方向',
    'card.speed': '速度 (ms)',
    'card.move': '動かす',
    'card.stop': '停止',
    'card.status': '状態取得',
    'card.goto': '絶対位置移動',
    'card.goto.btn': '移動',
    'card.pin': 'ピン',
    'card.duty': 'デューティ (0-255)',
    'card.freq': '周波数 (Hz)',
    'card.pwm': 'PWM',
    'card.mode.motor': 'モーター',
    'card.mode.gpio': 'GPIO',
    'ref.title': '外部制御リファレンス',
    'ref.rest.title': 'REST API',
    'ref.rest.note': 'HTTP POSTで任意の言語（p5.js、Pythonなど）からデバイスを制御',
    'ref.get.label': 'GET /api/devices — デバイス一覧の取得',
    'ref.post.label': 'POST /api/command — コマンド送信',
    'ref.deviceid.label': 'deviceId の指定方法',
    'ref.deviceid.index': 'デバイス番号（整数）',
    'ref.deviceid.ip': 'IPアドレス',
    'ref.deviceid.all': '全デバイスにブロードキャスト',
    'ref.p5.label': 'p5.js 使用例',
    'ref.osc.title': 'OSC',
    'ref.osc.note': 'UDP経由でコマンド送信。Pure Data、Max/MSP、TouchDesignerなどに対応',
    'ref.osc.addr.label': 'アドレスパターン',
    'ref.pd.label': 'Pure Data 使用例',
    'ref.osc.deviceid.label': 'deviceId（第1引数）の指定方法',
    'ref.osc.id.num': 'デバイス番号',
    'ref.osc.id.all': 'ブロードキャスト',
    'ref.osc.id.omit.key': '省略',
    'ref.osc.id.omit': 'ブロードキャスト',
    'ref.cmd.title': 'コマンド一覧',
    'ref.cmd.th.command': 'コマンド',
    'ref.cmd.th.params': 'パラメータ',
    'ref.cmd.th.desc': '説明',
    'ref.cmd.motor.move': 'direction: 1=CW, -1=CCW / speed: ms/step（最小5）',
    'ref.cmd.motor.goto': '絶対位置に移動。差分は自動計算。',
    'ref.cmd.motor.stop': '即座に停止',
    'ref.cmd.motor.status': '現在の状態を取得',
    'ref.cmd.switch.set': 'value: 1=ON, 0=OFF',
    'ref.cmd.switch.pwm': 'duty: 0–255 / freq: Hz（SSRには5–10推奨）',
    'ref.cmd.config.mode': '"motor" または "gpio"（セッション中のみ）',
    'ref.pin.title': 'ピンマッピング',
    'ref.pin.th.pin': 'pin',
    'ref.pin.th.gpio': 'GPIO',
    'ref.pin.th.motor': 'モーターモード',
    'ref.pin.th.gpio-mode': 'GPIOモード',
    'ref.pin.motor0': '✓（GPIO16に固定）',
  }
};

let currentLang = 'en';

function t(key) {
  return i18n[currentLang][key] || key;
}

function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const text = t(el.getAttribute('data-i18n'));
    if (text) el.textContent = text;
  });
}

function toggleLang() {
  currentLang = currentLang === 'en' ? 'ja' : 'en';
  document.getElementById('btn-lang').textContent = currentLang === 'en' ? 'JA' : 'EN';
  applyTranslations();
  if (!document.getElementById('ref-overlay').hidden) populateRef();
}

// --- Init ---
let httpPort = 3000;
let oscPort  = 9100;

function updateOscUI(active, port, error) {
  const input = document.getElementById('osc-port-input');
  const dot   = document.getElementById('osc-status-dot');
  if (input) {
    input.value = port;
    input.classList.toggle('osc-input-error', !active);
  }
  if (dot) {
    dot.className = 'osc-dot ' + (active ? 'osc-dot-active' : 'osc-dot-error');
    dot.title = error || (active ? `OSC active (UDP ${port})` : '');
  }
  // Update ref panel if open
  if (!document.getElementById('ref-overlay').hidden) populateRef();
}

function applyOscPort() {
  const input = document.getElementById('osc-port-input');
  const port  = parseInt(input.value);
  if (isNaN(port) || port < 1024 || port > 65535) return;
  if (port === oscPort) return;   // 値が変わっていなければ何もしない
  oscPort = port;
  window.gpub.restartOsc(port);
}

(async () => {
  const ports = await window.gpub.getPorts();
  httpPort = ports.http;
  oscPort  = ports.osc;
  document.getElementById('http-port-label').textContent = `HTTP :${httpPort}`;
  updateOscUI(ports.oscActive, ports.osc);
  applyTranslations();
})();

window.gpub.onOscStatus(({ active, port, error }) => {
  oscPort = port;
  updateOscUI(active, port, error);
});

// --- Device cards ---
window.gpub.onDevicesUpdated((devices) => {
  const currentIds = new Set(devices.map(d => d.id));

  // Remove disconnected
  for (const id of deviceMap.keys()) {
    if (!currentIds.has(id)) {
      const card = document.getElementById(`card-${id}`);
      if (card) card.remove();
      deviceMap.delete(id);
    }
  }

  // Add or update
  devices.forEach(dev => {
    if (!deviceMap.has(dev.id)) {
      createCard(dev);
    } else {
      updateCard(dev);
    }
    deviceMap.set(dev.id, dev);
  });

  noDevices.style.display = devices.length === 0 ? 'block' : 'none';
});

function createCard(dev) {
  const card = document.createElement('div');
  card.className = 'device-card';
  card.id = `card-${dev.id}`;
  card.innerHTML = cardHTML(dev);
  deviceCards.appendChild(card);
  bindCardEvents(card, dev.id);
  applyTranslations(card);
}

function updateCard(dev) {
  const card = document.getElementById(`card-${dev.id}`);
  if (!card) return;
  const statusEl = card.querySelector('.card-status');
  if (statusEl) {
    const mode = dev.mode !== 'unknown' ? dev.mode : '?';
    const state = dev.state !== 'unknown' ? dev.state : '?';
    statusEl.innerHTML =
      `<span class="badge-mode">${mode}</span>` +
      `<span class="badge-state badge-${dev.state}">${state}</span>` +
      `<span class="badge-pos">pos: ${dev.position}</span>`;
  }
}

function cardHTML(dev) {
  const mode = dev.mode !== 'unknown' ? dev.mode : '?';
  const state = dev.state !== 'unknown' ? dev.state : '?';
  return `
    <div class="card-header">
      <span class="card-index">#${dev.index}</span>
      <span class="card-ip">${dev.ip}</span>
      <span class="card-status">
        <span class="badge-mode">${mode}</span>
        <span class="badge-state badge-${dev.state}">${state}</span>
        <span class="badge-pos">pos: ${dev.position}</span>
      </span>
    </div>
    <div class="card-section">
      <div class="card-label" data-i18n="card.label.motor">Motor</div>
      <div class="control-row">
        <label><span data-i18n="card.steps">Steps</span>
          <input type="number" class="c-steps" value="200" min="1">
        </label>
        <label><span data-i18n="card.dir">Dir</span>
          <select class="c-dir">
            <option value="1">CW</option>
            <option value="-1">CCW</option>
          </select>
        </label>
        <label><span data-i18n="card.speed">Speed (ms)</span>
          <input type="number" class="c-speed" value="5" min="5">
        </label>
      </div>
      <div class="control-row">
        <button class="btn-primary c-move" data-i18n="card.move">Move</button>
        <button class="btn-danger c-stop" data-i18n="card.stop">Stop</button>
        <button class="c-status" data-i18n="card.status">Status</button>
      </div>
      <div class="control-row">
        <label><span data-i18n="card.goto">Goto (abs pos)</span>
          <input type="number" class="c-goto-pos" value="0">
        </label>
        <button class="btn-goto c-goto" data-i18n="card.goto.btn">Goto</button>
      </div>
    </div>
    <div class="card-section">
      <div class="card-label" data-i18n="card.label.switch">Switch / PWM</div>
      <div class="control-row">
        <label><span data-i18n="card.pin">Pin</span>
          <select class="c-pin">
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </label>
        <button class="btn-on c-sw-on">ON</button>
        <button class="btn-off c-sw-off">OFF</button>
      </div>
      <div class="control-row">
        <label><span data-i18n="card.duty">Duty (0-255)</span>
          <input type="number" class="c-duty" value="128" min="0" max="255">
        </label>
        <label><span data-i18n="card.freq">Freq (Hz)</span>
          <input type="number" class="c-freq" value="10" min="1">
        </label>
        <button class="btn-pwm c-pwm-set" data-i18n="card.pwm">PWM</button>
      </div>
    </div>
    <div class="card-section">
      <div class="card-label" data-i18n="card.label.mode">Mode</div>
      <div class="control-row">
        <button class="c-mode-motor" data-i18n="card.mode.motor">Motor</button>
        <button class="c-mode-gpio" data-i18n="card.mode.gpio">GPIO</button>
      </div>
    </div>
  `;
}

function bindCardEvents(card, deviceId) {
  const send = (command, data) => window.gpub.sendCommand(deviceId, command, data);

  card.querySelector('.c-move').onclick = () => {
    const steps = parseInt(card.querySelector('.c-steps').value) || 200;
    const direction = parseInt(card.querySelector('.c-dir').value);
    const speed = parseInt(card.querySelector('.c-speed').value) || 5;
    send('motor.move', { steps, direction, speed });
  };
  card.querySelector('.c-stop').onclick = () => send('motor.stop', {});
  card.querySelector('.c-status').onclick = () => send('motor.status', {});
  card.querySelector('.c-goto').onclick = () => {
    const position = parseInt(card.querySelector('.c-goto-pos').value) || 0;
    const speed = parseInt(card.querySelector('.c-speed').value) || 5;
    send('motor.goto', { position, speed });
  };
  card.querySelector('.c-sw-on').onclick = () => {
    const pin = parseInt(card.querySelector('.c-pin').value);
    send('switch.set', { pin, value: 1 });
  };
  card.querySelector('.c-sw-off').onclick = () => {
    const pin = parseInt(card.querySelector('.c-pin').value);
    send('switch.set', { pin, value: 0 });
  };
  card.querySelector('.c-pwm-set').onclick = () => {
    const pin  = parseInt(card.querySelector('.c-pin').value);
    const duty = parseInt(card.querySelector('.c-duty').value);
    const freq = parseInt(card.querySelector('.c-freq').value) || 10;
    send('switch.pwm', { pin, duty, freq });
  };
  card.querySelector('.c-mode-motor').onclick = () => send('config.mode', { mode: 'motor' });
  card.querySelector('.c-mode-gpio').onclick = () => send('config.mode', { mode: 'gpio' });
}

// --- Broadcast ---
function broadcastAll() {
  window.gpub.sendCommand('__all__', 'motor.status', {});
  appendLocalLog('send', '[BROADCAST] motor.status');
}

// --- Reference Panel ---
function toggleRef() {
  const overlay = document.getElementById('ref-overlay');
  const isHidden = overlay.hidden;
  overlay.hidden = !isHidden;
  if (isHidden) populateRef();
}

function handleOverlayClick(event) {
  if (event.target === document.getElementById('ref-overlay')) toggleRef();
}

function populateRef() {
  const base = `http://localhost:${httpPort}`;

  document.getElementById('ref-get-devices').textContent =
`fetch('${base}/api/devices')`;

  document.getElementById('ref-post-command').textContent =
`fetch('${base}/api/command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    deviceId: 1,          // ${currentLang === 'ja' ? 'デバイス番号 / IP / "__all__"' : 'device index / IP / "__all__"'}
    command:  'motor.move',
    data:     { steps: 200, direction: 1, speed: 5 }
  })
})`;

  document.getElementById('ref-p5-example').textContent =
`// motor.move
await fetch('${base}/api/command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deviceId: 1, command: 'motor.move',
    data: { steps: 200, direction: 1, speed: 5 } })
});

// switch.pwm${currentLang === 'ja' ? '（SSR + AC機器、ゼロクロスSSRなら freq は 5〜10 推奨）' : ' (SSR + AC, for zero-cross SSR freq 5–10 recommended)'}
await fetch('${base}/api/command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deviceId: 1, command: 'switch.pwm',
    data: { pin: 0, duty: 128, freq: 10 } })
});`;

  document.getElementById('ref-osc-address').textContent =
`Host: localhost  Port: ${oscPort}  (UDP)

/gpub/motor/move   [deviceId] steps direction speed
/gpub/motor/goto   [deviceId] position speed
/gpub/motor/stop   [deviceId]
/gpub/motor/status [deviceId]
/gpub/switch/set   [deviceId] pin value
/gpub/switch/pwm   [deviceId] pin duty freq
/gpub/config/mode  [deviceId] mode`;

  const pdComment = currentLang === 'ja'
    ? `; motor.move — デバイス #1 に 200ステップ CW、5ms/step`
    : `; motor.move — device #1, 200 steps CW, 5ms/step`;
  const pdComment2 = currentLang === 'ja'
    ? `; motor.goto — デバイス #1 を絶対位置 400 に移動`
    : `; motor.goto — device #1 to absolute position 400`;
  const pdComment3 = currentLang === 'ja'
    ? `; switch.pwm — デバイス #1 の pin 0 に duty=128、10Hz`
    : `; switch.pwm — device #1, pin 0, duty=128, 10Hz`;
  const pdComment4 = currentLang === 'ja'
    ? `; ブロードキャスト（deviceId省略）`
    : `; broadcast (omit deviceId)`;

  document.getElementById('ref-pd-example').textContent =
`${pdComment}
[list /gpub/motor/move 1 200 1 5(
|
[osc.send ${oscPort}]

${pdComment2}
[list /gpub/motor/goto 1 400 5(
|
[osc.send ${oscPort}]

${pdComment3}
[list /gpub/switch/pwm 1 0 128 10(
|
[osc.send ${oscPort}]

${pdComment4}
[list /gpub/motor/stop(
|
[osc.send ${oscPort}]`;
}

// --- Log ---
window.gpub.onLog((entry) => {
  const line = document.createElement('div');
  line.className = `log-entry log-${entry.type}`;
  const time = entry.timestamp.split('T')[1].split('.')[0];
  line.textContent = `[${time}] ${entry.message}`;
  logArea.appendChild(line);
  logArea.scrollTop = logArea.scrollHeight;
});

function clearLog() {
  logArea.innerHTML = '';
}

function appendLocalLog(type, message) {
  const line = document.createElement('div');
  line.className = `log-entry log-${type}`;
  const time = new Date().toISOString().split('T')[1].split('.')[0];
  line.textContent = `[${time}] ${message}`;
  logArea.appendChild(line);
  logArea.scrollTop = logArea.scrollHeight;
}
