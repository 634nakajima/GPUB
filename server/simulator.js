/**
 * GPUB Device Simulator
 * Usage:
 *   node simulator.js [num_devices] [server_url]
 *
 * Examples:
 *   node simulator.js          # 1 device, localhost:3000
 *   node simulator.js 3        # 3 devices
 *   node simulator.js 2 http://192.168.1.x:3000
 */

const { io } = require('socket.io-client');

const NUM_DEVICES = parseInt(process.argv[2]) || 1;
const SERVER_URL  = process.argv[3] || 'http://localhost:3000';

const RESET = '\x1b[0m';
const COLORS = ['\x1b[36m', '\x1b[33m', '\x1b[35m', '\x1b[32m', '\x1b[34m'];

function createDevice(index) {
  const fakeIP = `192.168.1.${10 + index}`;
  const color  = COLORS[index % COLORS.length];
  const prefix = `${color}[SIM ${index + 1} ${fakeIP}]${RESET}`;

  let mode      = 'motor';
  let state     = 'idle';
  let position  = 0;
  let moveTimer = null;

  const socket = io(SERVER_URL, {
    path: '/sx/socket.io/',
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 3000,
  });

  const log = (msg) => console.log(`${prefix} ${msg}`);

  socket.on('connect', () => {
    log(`connected (id: ${socket.id})`);
  });

  socket.on('disconnect', () => {
    log('disconnected');
    if (moveTimer) { clearTimeout(moveTimer); moveTimer = null; }
    state = 'idle';
  });

  socket.on('connect_error', (err) => {
    log(`\x1b[31mconnection error: ${err.message}${RESET}`);
  });

  // --- motor.move ---
  socket.on('motor.move', (data) => {
    if (mode !== 'motor') {
      log('motor.move rejected (GPIO mode)');
      return;
    }
    if (moveTimer) { clearTimeout(moveTimer); moveTimer = null; }

    const steps     = data.steps     || 200;
    const direction = data.direction || 1;
    const speed     = data.speed     || 5;
    const duration  = steps * speed;

    state = 'moving';
    log(`motor.move steps=${steps} dir=${direction > 0 ? 'CW' : 'CCW'} speed=${speed}ms → done in ${duration}ms`);
    socket.emit('ack.motor.move', { success: true });

    moveTimer = setTimeout(() => {
      position += steps * direction;
      state     = 'idle';
      moveTimer = null;
      log(`motor.done position=${position}`);
      socket.emit('ack.motor.done', { steps, position });
    }, duration);
  });

  // --- motor.goto ---
  socket.on('motor.goto', (data) => {
    if (mode !== 'motor') {
      log('motor.goto rejected (GPIO mode)');
      return;
    }
    if (moveTimer) { clearTimeout(moveTimer); moveTimer = null; }

    const targetPos = data.position ?? 0;
    const speed     = data.speed     || 5;
    const delta     = targetPos - position;

    if (delta === 0) {
      log(`motor.goto: already at position=${position}`);
      socket.emit('ack.motor.goto', { success: true, steps: 0 });
      return;
    }

    const steps    = Math.abs(delta);
    const duration = steps * speed;
    state = 'moving';
    log(`motor.goto: target=${targetPos} delta=${delta} speed=${speed}ms → done in ${duration}ms`);
    socket.emit('ack.motor.goto', { success: true });

    moveTimer = setTimeout(() => {
      position  = targetPos;
      state     = 'idle';
      moveTimer = null;
      log(`motor.done position=${position}`);
      socket.emit('ack.motor.done', { steps, position });
    }, duration);
  });

  // --- motor.stop ---
  socket.on('motor.stop', () => {
    if (moveTimer) { clearTimeout(moveTimer); moveTimer = null; }
    state = 'idle';
    log('motor.stop');
    socket.emit('ack.motor.stop', { success: true });
  });

  // --- motor.status ---
  socket.on('motor.status', () => {
    log(`motor.status → state=${state} position=${position} mode=${mode}`);
    socket.emit('ack.motor.status', { state, position, mode });
  });

  // --- switch.set ---
  socket.on('switch.set', (data) => {
    const pin   = data.pin   ?? 0;
    const value = data.value ?? 0;
    if (mode === 'motor' && pin !== 0) {
      log(`switch.set pin=${pin} rejected (motor mode: only pin 0 available)`);
      return;
    }
    log(`switch.set pin=${pin} → ${value ? 'ON' : 'OFF'}`);
    socket.emit('ack.switch.set', { pin, value });
  });

  // --- switch.pwm ---
  socket.on('switch.pwm', (data) => {
    const pin  = data.pin  ?? 0;
    const duty = data.duty ?? 128;
    const freq = data.freq ?? 1000;
    if (mode === 'motor' && pin !== 0) {
      log(`switch.pwm pin=${pin} rejected (motor mode: only pin 0 available)`);
      return;
    }
    log(`switch.pwm pin=${pin} duty=${duty}/255 freq=${freq}Hz`);
    socket.emit('ack.switch.pwm', { pin, duty, freq });
  });

  // --- config.mode ---
  socket.on('config.mode', (data) => {
    mode = data.mode || mode;
    log(`config.mode → ${mode}`);
    socket.emit('ack.config.mode', { mode });
  });
}

console.log(`GPUB Simulator — ${NUM_DEVICES} device(s) → ${SERVER_URL}`);
console.log('Press Ctrl+C to stop.\n');

for (let i = 0; i < NUM_DEVICES; i++) {
  setTimeout(() => createDevice(i), i * 600);
}
