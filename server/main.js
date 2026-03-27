const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { Server: OscServer } = require('node-osc');

const PORT     = 3000;
const OSC_PORT = 9000;

// --- HTTP + Socket.IO Server ---
const expressApp = express();
expressApp.use(express.json());
expressApp.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const httpServer = http.createServer(expressApp);
const io = new Server(httpServer, {
  path: '/sx/socket.io/',
  cors: { origin: '*' }
});

// Connected devices: Map<socketId, { id, index, ip, mode, state, position, connectedAt }>
const devices = new Map();
let mainWindow = null;
let deviceCounter = 0;

// --- Socket.IO: Device connections ---
io.on('connection', (socket) => {
  const ip = socket.handshake.address;
  deviceCounter++;
  devices.set(socket.id, {
    id: socket.id,
    index: deviceCounter,
    ip,
    mode: 'unknown',
    state: 'unknown',
    position: 0,
    connectedAt: new Date().toISOString()
  });

  logToRenderer('connect', `Device #${deviceCounter} connected: ${socket.id} (${ip})`);
  sendDeviceList();

  const ackEvents = [
    'ack.motor.move', 'ack.motor.done', 'ack.motor.stop',
    'ack.motor.status', 'ack.switch.set', 'ack.config.mode'
  ];

  ackEvents.forEach((event) => {
    socket.on(event, (data) => {
      const dev = devices.get(socket.id);
      const tag = dev ? `#${dev.index}` : socket.id;
      logToRenderer('ack', `[${tag}] ${event}: ${JSON.stringify(data)}`);

      if (!dev) return;
      if (event === 'ack.motor.status') {
        dev.state    = data.state    || dev.state;
        dev.position = data.position ?? dev.position;
        dev.mode     = data.mode     || dev.mode;
        sendDeviceList();
      }
      if (event === 'ack.motor.done') {
        dev.state    = 'idle';
        dev.position = data.position ?? dev.position;
        sendDeviceList();
      }
      if (event === 'ack.config.mode') {
        dev.mode = data.mode || dev.mode;
        sendDeviceList();
      }
    });
  });

  socket.on('disconnect', () => {
    const dev = devices.get(socket.id);
    const tag = dev ? `#${dev.index}` : socket.id;
    devices.delete(socket.id);
    logToRenderer('disconnect', `Device ${tag} disconnected`);
    sendDeviceList();
  });
});

// --- resolveTarget ---
// Accepts:
//   number or numeric string → device index (e.g. 1, "1")
//   IP string               → matched against dev.ip
//   socket ID string        → used directly
//   "__all__" or omitted    → broadcast
// Returns socket ID string, "__all__", or null (not found)
function resolveTarget(arg) {
  if (arg === undefined || arg === null || arg === '__all__') return '__all__';

  const n = Number(arg);
  if (!isNaN(n) && n > 0) {
    for (const dev of devices.values()) {
      if (dev.index === n) return dev.id;
    }
    logToRenderer('error', `Device #${n} not found`);
    return null;
  }

  // IP match (partial: e.g. "192.168.1.10" matches "::ffff:192.168.1.10")
  for (const dev of devices.values()) {
    if (dev.ip === arg || dev.ip.endsWith(arg)) return dev.id;
  }

  // Assume socket ID
  return arg;
}

// --- sendCommand ---
function sendCommand(deviceId, command, data) {
  if (deviceId === '__all__') {
    io.emit(command, data);
    logToRenderer('send', `[BROADCAST] ${command}: ${JSON.stringify(data)}`);
  } else {
    const socket = io.sockets.sockets.get(deviceId);
    if (socket) {
      const dev = devices.get(deviceId);
      const tag = dev ? `#${dev.index}` : deviceId;
      socket.emit(command, data);
      logToRenderer('send', `[${tag}] ${command}: ${JSON.stringify(data)}`);
    } else {
      logToRenderer('error', `Device not found: ${deviceId}`);
    }
  }
}

// --- REST API ---
// GET  /api/devices
// POST /api/command  { deviceId, command, data }
//   deviceId: index number (1,2,...), IP address, socket ID, or "__all__"

expressApp.get('/api/devices', (req, res) => {
  res.json(Array.from(devices.values()));
});

expressApp.post('/api/command', (req, res) => {
  const { deviceId, command, data = {} } = req.body;
  if (!command) return res.status(400).json({ error: 'command is required' });

  const target = resolveTarget(deviceId);
  if (target === null) return res.status(404).json({ error: `Device not found: ${deviceId}` });

  sendCommand(target, command, data);
  res.json({ ok: true });
});

// --- OSC Server (UDP port 9000) ---
// Message format: /gpub/<command> [deviceId] ...args
//
//   /gpub/motor/move   [deviceId] steps direction speed
//   /gpub/motor/stop   [deviceId]
//   /gpub/motor/status [deviceId]
//   /gpub/switch/set   [deviceId] pin value
//   /gpub/config/mode  [deviceId] mode
//
// deviceId: index number (1,2,...), IP string, socket ID, or "__all__"
// Omit deviceId to broadcast to all devices.
//
// Pure Data examples (ELSE library osc.send):
//   [list /gpub/motor/move 1 200 1 5(  ->  [osc.send 9000]   <- device #1
//   [list /gpub/motor/goto 1 400 5(    ->  [osc.send 9000]   <- absolute position
//   [list /gpub/motor/move 200 1 5(    ->  [osc.send 9000]   <- broadcast (omit deviceId)

const oscServer = new OscServer(OSC_PORT, '0.0.0.0', () => {
  console.log(`OSC server listening on UDP port ${OSC_PORT}`);
});

oscServer.on('message', (msg) => {
  const [address, ...args] = msg;

  // Heuristic: if first arg is a number ≤ 255 and there are more args, treat as deviceId
  // If first arg is a string (socketId / IP / "__all__"), treat as deviceId
  let rawTarget = '__all__';
  let params = args;

  if (args.length > 0) {
    const first = args[0];
    const isIndex = typeof first === 'number' && first > 0 && first <= 255;
    const isString = typeof first === 'string';
    if (isIndex || isString) {
      rawTarget = first;
      params = args.slice(1);
    }
  }

  const target = resolveTarget(rawTarget);
  if (target === null) return;

  switch (address) {
    case '/gpub/motor/move':
      sendCommand(target, 'motor.move', {
        steps:     +params[0] || 200,
        direction: +params[1] || 1,
        speed:     +params[2] || 5
      });
      break;
    case '/gpub/motor/goto':
      sendCommand(target, 'motor.goto', {
        position: +params[0] || 0,
        speed:    +params[1] || 5
      });
      break;
    case '/gpub/motor/stop':
      sendCommand(target, 'motor.stop', {});
      break;
    case '/gpub/motor/status':
      sendCommand(target, 'motor.status', {});
      break;
    case '/gpub/switch/set':
      sendCommand(target, 'switch.set', { pin: +params[0], value: +params[1] });
      break;
    case '/gpub/config/mode':
      sendCommand(target, 'config.mode', { mode: params[0] });
      break;
    default:
      logToRenderer('error', `Unknown OSC address: ${address}`);
  }
});

// --- IPC: Renderer <-> Main ---
ipcMain.handle('send-command', (event, { deviceId, command, data }) => {
  sendCommand(deviceId, command, data);
});

ipcMain.handle('get-devices', () => Array.from(devices.values()));

ipcMain.handle('get-ports', () => ({ http: PORT, osc: OSC_PORT }));

// --- Helpers ---
function logToRenderer(type, message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log', { type, message, timestamp: new Date().toISOString() });
  }
}

function sendDeviceList() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('devices-updated', Array.from(devices.values()));
  }
}

// --- Electron Window ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`HTTP + Socket.IO server listening on port ${PORT}`);
  });
  createWindow();
});

app.on('window-all-closed', () => {
  oscServer.close();
  httpServer.close();
  app.quit();
});
