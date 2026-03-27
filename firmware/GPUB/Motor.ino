// Stepper Motor Control
// 2-phase, 4-step sequence via inA/inB pins
// PoS: motor enable (active LOW), Vs2B: voltage enable

const int inA = 5;
const int inB = 17;
const int PoS = 4;
const int Vs2B = 15;
const int LED_PIN = 16;

void initMotorPins() {
  pinMode(inA, OUTPUT);
  pinMode(inB, OUTPUT);
  pinMode(PoS, OUTPUT);
  pinMode(Vs2B, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  digitalWrite(inA, LOW);
  digitalWrite(inB, LOW);
  digitalWrite(Vs2B, LOW);
  digitalWrite(PoS, HIGH);
  digitalWrite(LED_PIN, LOW);
}

void initGPIOPins() {
  for (int i = 0; i < NUM_OUTPUT_PINS; i++) {
    pinMode(outputPins[i], OUTPUT);
    digitalWrite(outputPins[i], LOW);
  }
}

// Called from timer interrupt (every 5ms)
void driveMotor() {
  if (motorState != MOVING) {
    stopMotor();
    return;
  }

  // Speed control: step only when interval count matches
  stepIntervalCount += 5; // 5ms per tick
  if (stepIntervalCount < stepInterval) {
    // Keep motor energized but don't step yet
    return;
  }
  stepIntervalCount = 0;

  // Execute one step
  stepMotor();

  targetSteps--;
  if (targetSteps <= 0) {
    motorState = IDLE;
    stopMotor();
    // Send completion ACK (deferred to loop via flag)
    motorMoveAckPending = true;
  }
}

// Check for deferred ACKs (called from loop, not from ISR)
void checkMotorAck() {
  if (motorMoveAckPending && motorState == IDLE) {
    String payload = "{\"steps\":" + String(stepPosition) +
                     ",\"position\":" + String(stepPosition) + "}";
    sendAck("ack.motor.done", payload);
    motorMoveAckPending = false;
  }
}

void stepMotor() {
  digitalWrite(Vs2B, HIGH);
  digitalWrite(PoS, LOW);

  switch (stepCount) {
    case 0: // 00
      digitalWrite(inA, LOW);
      digitalWrite(inB, LOW);
      break;
    case 1: // 01
      digitalWrite(inA, LOW);
      digitalWrite(inB, HIGH);
      break;
    case 2: // 11
      digitalWrite(inA, HIGH);
      digitalWrite(inB, HIGH);
      break;
    case 3: // 10
      digitalWrite(inA, HIGH);
      digitalWrite(inB, LOW);
      break;
  }

  // Advance step count based on direction
  if (motorDirection >= 0) {
    stepCount = (stepCount + 1) % 4;
    stepPosition++;
  } else {
    stepCount = (stepCount + 3) % 4; // equivalent to (stepCount - 1 + 4) % 4
    stepPosition--;
  }
}

void stopMotor() {
  digitalWrite(PoS, HIGH);
  digitalWrite(Vs2B, LOW);
}

// --- PWM (LEDC) ---

void setPinPWM(int pinIndex, int duty, int freq) {
  if (pinIndex < 0 || pinIndex >= NUM_OUTPUT_PINS) return;
  int pin = outputPins[pinIndex];
  int channel = pinIndex; // LEDC channels 0-4

  if (freq <= 0) freq = 1000;
  duty = constrain(duty, 0, 255);

  ledcSetup(channel, freq, LEDC_RESOLUTION);
  ledcAttachPin(pin, channel);
  ledcWrite(channel, duty);
  pinPWMActive[pinIndex] = true;
}

// Detach LEDC from a pin, restoring normal digitalWrite control
void stopPinPWM(int pinIndex) {
  if (pinIndex < 0 || pinIndex >= NUM_OUTPUT_PINS) return;
  if (!pinPWMActive[pinIndex]) return;
  ledcDetachPin(outputPins[pinIndex]);
  digitalWrite(outputPins[pinIndex], LOW);
  pinPWMActive[pinIndex] = false;
}

// Detach all active PWM channels (called on mode switch)
void stopAllPWM() {
  for (int i = 0; i < NUM_OUTPUT_PINS; i++) {
    stopPinPWM(i);
  }
}
