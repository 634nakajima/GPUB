#ifndef APSSID
#define APSSID "ubiquitel"
#endif

const char *ubssid = APSSID;

WebServer server(80);

// EEPROM Layout:
// 0-63:    SSID (64 bytes)
// 64-127:  Password (64 bytes)
// 128-255: Server URL (128 bytes)
// 256-259: Server Port (4 bytes, int)
// 260-263: Device Mode (4 bytes: 0=motor, 1=gpio)

#define EEPROM_SIZE 512
#define ADDR_SSID 0
#define LEN_SSID 64
#define ADDR_PASS 64
#define LEN_PASS 64
#define ADDR_URL 128
#define LEN_URL 128
#define ADDR_PORT 256
#define ADDR_MODE 260

const String postForms = "<html>\
  <head>\
    <title>Ubiquitel Setup</title>\
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\
    <style>\
      body { background-color: #222; font-family: Arial, sans-serif; color: #eee; padding: 20px; }\
      h1 { color: #4fc3f7; font-size: 1.5em; }\
      h2 { font-size: 1em; margin-top: 1.2em; }\
      input[type=text], input[type=number] { width: 100%; padding: 8px; margin: 4px 0; box-sizing: border-box; }\
      input[type=submit] { background: #4fc3f7; border: none; padding: 12px 24px; margin-top: 16px; font-size: 1em; cursor: pointer; }\
      .section { border: 1px solid #444; padding: 12px; margin: 12px 0; border-radius: 8px; }\
      label { margin-right: 16px; }\
    </style>\
  </head>\
  <body>\
    <h1>Ubiquitel Setup</h1>\
    <form method=\"post\" enctype=\"application/x-www-form-urlencoded\" action=\"/postform/\">\
      <div class=\"section\">\
        <h2>Wi-Fi</h2>\
        SSID<br><input type=\"text\" name=\"ssid\"><br>\
        Password<br><input type=\"text\" name=\"password\"><br>\
      </div>\
      <div class=\"section\">\
        <h2>Server</h2>\
        URL<br><input type=\"text\" name=\"serverurl\" placeholder=\"example.com\"><br>\
        Port<br><input type=\"number\" name=\"serverport\" value=\"443\"><br>\
      </div>\
      <div class=\"section\">\
        <h2>Device Mode</h2>\
        <label><input type=\"radio\" name=\"mode\" value=\"0\" checked> Motor</label>\
        <label><input type=\"radio\" name=\"mode\" value=\"1\"> GPIO Only</label>\
      </div>\
      <input type=\"submit\" value=\"Save &amp; Reboot\">\
    </form>\
  </body>\
</html>";

void handleRoot() {
  server.send(200, "text/html", postForms);
}

void handleForm() {
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }

  String newSSID = server.arg("ssid");
  String newPass = server.arg("password");
  String newURL = server.arg("serverurl");
  int newPort = server.arg("serverport").toInt();
  int newMode = server.arg("mode").toInt();

  writeEEPROMString(ADDR_SSID, newSSID, LEN_SSID);
  writeEEPROMString(ADDR_PASS, newPass, LEN_PASS);
  writeEEPROMString(ADDR_URL, newURL, LEN_URL);
  writeEEPROMInt(ADDR_PORT, newPort);
  writeEEPROMInt(ADDR_MODE, newMode);

  if (EEPROM.commit()) {
    Serial.println("EEPROM saved.");
    Serial.print("SSID: "); Serial.println(newSSID);
    Serial.print("URL: "); Serial.println(newURL);
    Serial.print("Port: "); Serial.println(newPort);
    Serial.print("Mode: "); Serial.println(newMode);
    server.send(200, "text/html", "<html><body style='background:#222;color:#eee;padding:20px;font-family:Arial'><h1>Saved! Rebooting...</h1></body></html>");
    delay(1000);
    ESP.restart();
  } else {
    Serial.println("EEPROM commit failed!");
    server.send(500, "text/plain", "EEPROM write failed");
  }
}

void handleNotFound() {
  server.send(404, "text/plain", "Not Found");
}

void setupServer() {
  WiFi.disconnect();
  WiFi.softAP(ubssid);
  IPAddress myIP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(myIP);

  server.on("/", handleRoot);
  server.on("/postform/", handleForm);
  server.onNotFound(handleNotFound);
  server.begin();
  Serial.println("HTTP server started");
}

void loopServer() {
  server.handleClient();
}

// --- EEPROM Helpers ---

void setupEEPROM() {
  Serial.begin(115200);
  EEPROM.begin(EEPROM_SIZE);
  readEEPROMString(ADDR_SSID, ssid, LEN_SSID);
  readEEPROMString(ADDR_PASS, password, LEN_PASS);
  readEEPROMString(ADDR_URL, serverURL, LEN_URL);
  serverPort = readEEPROMInt(ADDR_PORT);
  deviceMode = readEEPROMInt(ADDR_MODE);

  // Sanity checks
  if (serverPort <= 0 || serverPort > 65535) serverPort = 443;
  if (deviceMode != MODE_MOTOR && deviceMode != MODE_GPIO) deviceMode = MODE_MOTOR;

  Serial.print("SSID: "); Serial.println(ssid);
  Serial.print("Server: "); Serial.print(serverURL); Serial.print(":"); Serial.println(serverPort);
  Serial.print("Mode: "); Serial.println(deviceMode == MODE_MOTOR ? "MOTOR" : "GPIO");
}

void writeEEPROMString(int addr, String data, int maxLen) {
  int len = data.length();
  if (len >= maxLen) len = maxLen - 1;
  for (int i = 0; i < len; i++) {
    EEPROM.write(addr + i, data.c_str()[i]);
  }
  EEPROM.write(addr + len, 0); // null terminator
  // Clear remaining bytes
  for (int i = len + 1; i < maxLen; i++) {
    EEPROM.write(addr + i, 0);
  }
}

void readEEPROMString(int addr, char *buf, int maxLen) {
  for (int i = 0; i < maxLen; i++) {
    buf[i] = EEPROM.read(addr + i);
  }
  buf[maxLen - 1] = 0; // ensure null termination
}

void writeEEPROMInt(int addr, int value) {
  EEPROM.write(addr, (value >> 24) & 0xFF);
  EEPROM.write(addr + 1, (value >> 16) & 0xFF);
  EEPROM.write(addr + 2, (value >> 8) & 0xFF);
  EEPROM.write(addr + 3, value & 0xFF);
}

int readEEPROMInt(int addr) {
  return ((int)EEPROM.read(addr) << 24) |
         ((int)EEPROM.read(addr + 1) << 16) |
         ((int)EEPROM.read(addr + 2) << 8) |
         (int)EEPROM.read(addr + 3);
}
