void socketIOEvent(socketIOmessageType_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case sIOtype_DISCONNECT:
      Serial.printf("[IOc] Disconnected!\n");
      break;
    case sIOtype_CONNECT:
      Serial.printf("[IOc] Connected to url: %s\n", payload);
      webSocket.send(sIOtype_CONNECT, "/");
      break;
    case sIOtype_EVENT:
      Serial.printf("[IOc] get event: %s\n", payload);
      eventHandler((char *)payload);
      break;
    case sIOtype_ACK:
      Serial.printf("[IOc] get ack: %u\n", length);
      break;
    case sIOtype_ERROR:
      Serial.printf("[IOc] get error: %u\n", length);
      break;
    case sIOtype_BINARY_EVENT:
      Serial.printf("[IOc] get binary: %u\n", length);
      break;
    case sIOtype_BINARY_ACK:
      Serial.printf("[IOc] get binary ack: %u\n", length);
      break;
  }
}

void eventHandler(char* p) {
  JSONVar myObject = JSON.parse(p);

  if (JSON.typeof(myObject) == "undefined") {
    Serial.println("JSON parse failed!");
    return;
  }

  String cmd = (const char*)myObject[0];

  if (cmd == "motor.move") {
    handleMotorMove(myObject[1]);
  } else if (cmd == "motor.stop") {
    handleMotorStop();
  } else if (cmd == "motor.status") {
    handleMotorStatus();
  } else if (cmd == "switch.set") {
    handleSwitchSet(myObject[1]);
  } else if (cmd == "config.mode") {
    handleConfigMode(myObject[1]);
  } else {
    Serial.print("unknown command: ");
    Serial.println(cmd);
  }
}

// --- Command Handlers ---

void handleMotorMove(JSONVar data) {
  if (deviceMode != MODE_MOTOR) {
    sendAck("ack.motor.move", "{\"success\":false,\"error\":\"not in motor mode\"}");
    return;
  }

  int steps = (int)data["steps"];
  int dir = data.hasOwnProperty("direction") ? (int)data["direction"] : 1;
  int speed = data.hasOwnProperty("speed") ? (int)data["speed"] : 5;

  if (steps <= 0) {
    sendAck("ack.motor.move", "{\"success\":false,\"error\":\"invalid steps\"}");
    return;
  }

  // Set motor parameters (atomic-ish: timer reads these)
  stepInterval = (speed < 5) ? 5 : speed; // minimum 5ms/step
  motorDirection = (dir >= 0) ? 1 : -1;
  stepIntervalCount = 0;
  targetSteps = steps;
  motorMoveAckPending = false; // will be set true by ISR on completion
  motorState = MOVING;

  sendAck("ack.motor.move", "{\"success\":true}");
  Serial.printf("motor.move: steps=%d dir=%d speed=%dms\n", steps, motorDirection, stepInterval);
}

void handleMotorStop() {
  if (deviceMode != MODE_MOTOR) {
    sendAck("ack.motor.stop", "{\"success\":false,\"error\":\"not in motor mode\"}");
    return;
  }
  motorState = IDLE;
  targetSteps = 0;
  stopMotor();
  sendAck("ack.motor.stop", "{\"success\":true}");
  Serial.println("motor.stop");
}

void handleMotorStatus() {
  String state = (motorState == MOVING) ? "moving" : "idle";
  String mode = (deviceMode == MODE_MOTOR) ? "motor" : "gpio";
  String payload = "{\"state\":\"" + state +
                   "\",\"position\":" + String(stepPosition) +
                   ",\"mode\":\"" + mode + "\"}";
  sendAck("ack.motor.status", payload);
}

void handleSwitchSet(JSONVar data) {
  int pin = (int)data["pin"];
  int value = (int)data["value"];

  if (deviceMode == MODE_MOTOR) {
    // Motor mode: only pin 0 (LED/GPIO16) is available
    if (pin != 0) {
      sendAck("ack.switch.set", "{\"success\":false,\"error\":\"pin unavailable in motor mode\"}");
      return;
    }
    digitalWrite(outputPins[4], value ? HIGH : LOW); // GPIO16 = outputPins[4]
  } else {
    // GPIO mode: all 5 pins available
    if (pin < 0 || pin >= NUM_OUTPUT_PINS) {
      sendAck("ack.switch.set", "{\"success\":false,\"error\":\"invalid pin\"}");
      return;
    }
    digitalWrite(outputPins[pin], value ? HIGH : LOW);
  }

  String payload = "{\"pin\":" + String(pin) + ",\"value\":" + String(value) + "}";
  sendAck("ack.switch.set", payload);
  Serial.printf("switch.set: pin=%d value=%d\n", pin, value);
}

void handleConfigMode(JSONVar data) {
  String mode = (const char*)data["mode"];

  if (mode == "motor") {
    // Switching to motor mode: stop all GPIO outputs, reconfigure pins
    for (int i = 0; i < NUM_OUTPUT_PINS; i++) {
      digitalWrite(outputPins[i], LOW);
    }
    deviceMode = MODE_MOTOR;
    initMotorPins();
  } else if (mode == "gpio") {
    // Switching to GPIO mode: stop motor first
    motorState = IDLE;
    targetSteps = 0;
    stopMotor();
    deviceMode = MODE_GPIO;
    initGPIOPins();
  } else {
    sendAck("ack.config.mode", "{\"success\":false,\"error\":\"unknown mode\"}");
    return;
  }

  String payload = "{\"mode\":\"" + mode + "\"}";
  sendAck("ack.config.mode", payload);
  Serial.print("config.mode: "); Serial.println(mode);
}

// --- Helpers ---

void sendAck(const char* event, String payload) {
  String msg = "[\"" + String(event) + "\"," + payload + "]";
  webSocket.sendEVENT(msg);
}

void setupSocketIO() {
  if (strlen(serverURL) == 0) {
    Serial.println("No server URL configured. Skipping Socket.IO.");
    return;
  }
  Serial.printf("SocketIO connecting to %s:%d...\n", serverURL, serverPort);
  webSocket.beginSSL(serverURL, serverPort, "/sx/socket.io/?EIO=4");
  webSocket.onEvent(socketIOEvent);
}
