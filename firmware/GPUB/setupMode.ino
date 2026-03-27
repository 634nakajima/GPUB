// Setup mode: triggered when WiFi fails or test button held >2s
// In setup mode: configure WiFi/server via 192.168.4.1
// Test button: runs motor test (motor mode) or toggles outputs (gpio mode)

void checkTestMotor() {
  if (!digitalRead(testButton) && !testRunning && setupMode) {
    testRunning = true;
    testPhase = 0;
    testCount = 0;
    Serial.println("Test started");
  }

  if (!testRunning) return;

  if (deviceMode == MODE_MOTOR) {
    // Motor test: 32 steps forward, pause, 32 steps reverse
    switch (testPhase) {
      case 0: // Forward
        if (testCount < 32) {
          stepMotor();
          testCount++;
        } else {
          stopMotor();
          testCount = 0;
          testPhase = 1;
        }
        break;
      case 1: // Pause
        if (testCount < 20) {
          testCount++;
        } else {
          testCount = 0;
          testPhase = 2;
          motorDirection = -1;
        }
        break;
      case 2: // Reverse
        if (testCount < 32) {
          stepMotor();
          testCount++;
        } else {
          stopMotor();
          motorDirection = 1;
          testRunning = false;
          Serial.println("Test done");
        }
        break;
    }
  } else {
    // GPIO test: cycle through all output pins
    if (testCount < NUM_OUTPUT_PINS * 10) {
      int pinIdx = testCount / 10;
      int tick = testCount % 10;
      if (tick == 0) {
        digitalWrite(outputPins[pinIdx], HIGH);
      } else if (tick == 5) {
        digitalWrite(outputPins[pinIdx], LOW);
      }
      testCount++;
    } else {
      testRunning = false;
      Serial.println("GPIO test done");
    }
  }
}

void checkSetupMode() {
  if (!digitalRead(testButton) && !setupMode) {
    if (!pushed) {
      pushedTime = millis();
      pushed = true;
    } else if ((millis() - pushedTime) > 2000) {
      setupMode = true;
      setupServer();
    }
  } else if (setupMode) {
    loopServer();
  } else {
    pushed = false;
  }
}
