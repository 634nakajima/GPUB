# GPUB

ESP32-based general-purpose stepper motor controller with Wi-Fi connectivity and Socket.IO remote control.

## Features

- **Stepper Motor Control** — Position control (step count), speed control (ms/step), bidirectional rotation (CW/CCW)
- **GPIO Output Mode** — Motor pins can be repurposed as general-purpose switched outputs (e.g. via external FETs)
- **Wi-Fi Setup via AP Mode** — Configure SSID, password, server URL/port, and device mode through a built-in web interface (192.168.4.1)
- **Socket.IO Communication** — Real-time command/response protocol over SSL WebSocket
- **OTA Updates** — Over-the-air firmware updates via ArduinoOTA

## Hardware

- **MCU**: ESP32
- **Motor Driver**: Dual H-Bridge (2-phase, 4-step sequence)
- **Tested Motor**: SM-42BYG011-25 (NEMA 17, 12V, bipolar)

### Pin Assignment

| Pin | GPIO | Function (Motor Mode) | Function (GPIO Mode) |
|-----|------|-----------------------|----------------------|
| inA | 5 | Stepper phase A | Output 0 |
| inB | 17 | Stepper phase B | Output 1 |
| PoS | 4 | Motor enable (active LOW) | Output 2 |
| Vs2B | 15 | Voltage enable | Output 3 |
| LED | 16 | General output | Output 4 |
| dock | 13 | (unused, INPUT_PULLUP) | — |
| testButton | 2 | Test / setup mode trigger | Test / setup mode trigger |

## Socket.IO Command Protocol

### Server to Device

| Command | Payload | Description |
|---------|---------|-------------|
| `motor.move` | `{ steps, direction, speed }` | Move motor by specified steps. direction: 1 (CW) or -1 (CCW). speed: ms/step (min 5) |
| `motor.stop` | `{}` | Immediately stop motor |
| `motor.status` | `{}` | Request current state |
| `switch.set` | `{ pin, value }` | Set output pin HIGH/LOW. Motor mode: pin 0 only. GPIO mode: pins 0-4 |
| `config.mode` | `{ mode }` | Switch between `"motor"` and `"gpio"` mode (session only) |

### Device to Server (ACK)

| Event | Payload | Description |
|-------|---------|-------------|
| `ack.motor.move` | `{ success }` | Move command accepted |
| `ack.motor.done` | `{ steps, position }` | Move completed |
| `ack.motor.stop` | `{ success }` | Stop confirmed |
| `ack.motor.status` | `{ state, position, mode }` | Current state |
| `ack.switch.set` | `{ pin, value }` | Output set confirmed |
| `ack.config.mode` | `{ mode }` | Mode switch confirmed |

## Setup

1. Flash the firmware to an ESP32
2. On first boot (or if Wi-Fi fails), the device starts in AP mode with SSID `ubiquitel`
3. Connect to the AP and open `http://192.168.4.1` in a browser
4. Enter your Wi-Fi credentials, Socket.IO server URL/port, and device mode
5. The device reboots and connects to the configured server

Hold the test button for 2+ seconds during normal operation to re-enter setup mode.

## Dependencies

- [arduinoWebSockets](https://github.com/Links2004/arduinoWebSockets) (Socket.IO client)
- [Arduino_JSON](https://github.com/arduino-libraries/Arduino_JSON)
- ESP32 Arduino Core (WiFi, WebServer, EEPROM, ArduinoOTA, Ticker)

## File Structure

| File | Role |
|------|------|
| `Ub.ino` | Entry point, setup/loop |
| `ub.h` | Global variables and type definitions |
| `Motor.ino` | Stepper motor control (step sequence, speed, direction) |
| `ubSocket.ino` | Socket.IO connection and command handler |
| `setupServer.ino` | AP mode HTTP server and EEPROM management |
| `setupMode.ino` | Setup mode / test button logic |
| `timer.ino` | 5ms timer interrupt |
| `OTA.ino` | Over-the-air update setup |

## License

MIT
