const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gpub', {
  sendCommand: (deviceId, command, data) =>
    ipcRenderer.invoke('send-command', { deviceId, command, data }),
  getDevices:  () => ipcRenderer.invoke('get-devices'),
  getPorts:    () => ipcRenderer.invoke('get-ports'),
  restartOsc:  (port) => ipcRenderer.invoke('restart-osc', port),
  onLog:            (cb) => ipcRenderer.on('log',             (_, d) => cb(d)),
  onDevicesUpdated: (cb) => ipcRenderer.on('devices-updated', (_, d) => cb(d)),
  onOscStatus:      (cb) => ipcRenderer.on('osc-status',      (_, d) => cb(d))
});
