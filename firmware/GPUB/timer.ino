// Timer interrupt callback (every 5ms)
void timer() {
  if (deviceMode == MODE_MOTOR) {
    driveMotor();
  }
  checkTestMotor();
}
