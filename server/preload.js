const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gpub', {
  sendCommand: (deviceId, command, data) =>
    ipcRenderer.invoke('send-command', { deviceId, command, data }),
  getDevices: () => ipcRenderer.invoke('get-devices'),
  getPorts:   () => ipcRenderer.invoke('get-ports'),
  onLog:            (cb) => ipcRenderer.on('log',             (_, d) => cb(d)),
  onDevicesUpdated: (cb) => ipcRenderer.on('devices-updated', (_, d) => cb(d))
});
