#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <WiFiUdp.h>
#include <ArduinoOTA.h>
#include <Ticker.h>
#include <EEPROM.h>
#include <SocketIOclient.h> // ArduinoWebsockets: https://github.com/Links2004/arduinoWebSockets
#include <WebSocketsClient.h>
#include <Arduino_JSON.h>
#include <WiFiClientSecure.h>
#include "ub.h"

void setup() {
  setupEEPROM();
  setupOTA();

  if (deviceMode == MODE_MOTOR) {
    initMotorPins();
  } else {
    initGPIOPins();
  }
  pinMode(testButton, INPUT_PULLUP);

  setupSocketIO();
  ticker.attach(0.005, timer);
}

void loop() {
  if (!setupMode) {
    ArduinoOTA.handle();
  }
  webSocket.loop();
  checkSetupMode();
  checkMotorAck();
}
