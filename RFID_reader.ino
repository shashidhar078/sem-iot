#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>

#define SS_PIN 5
#define RST_PIN 22

MFRC522 rfid(SS_PIN, RST_PIN);

const char* ssid = "Ganesh";
const char* password = "Bhaskar18";
//const char* ssid = "Ganesh's iPhone";
//const char* password = "12346587009";
//const char* ssid = "WIFI@IT";
//const char* password = "itnet24";

// Backend URL
const char* serverURL = "http://192.168.0.103:5000/scan";

String lastUID = "";
unsigned long lastScanTime = 0;

// 🔹 UID
String getUID() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

// 🔹 WiFi
void connectWiFi() {
  WiFi.begin(ssid, password);

  Serial.print("Connecting...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.println(WiFi.localIP());
}

// 🔹 Send UID
void sendUID(String uid) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    http.begin(serverURL);
    http.addHeader("Content-Type", "application/json");

    String json = "{\"uid\":\"" + uid + "\"}";

    int response = http.POST(json);

    Serial.print("UID Sent: ");
    Serial.println(uid);

    Serial.print("Response: ");
    Serial.println(response);

    if (response > 0) {
      Serial.println(http.getString());
    }

    http.end();
  }
}

void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();

  connectWiFi();

  Serial.println("Ready to scan...");
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  String uid = getUID();

  unsigned long now = millis();

  if (uid != lastUID || (now - lastScanTime > 2000)) {
    Serial.println("Scanned: " + uid);

    sendUID(uid);

    lastUID = uid;
    lastScanTime = now;
  }

  rfid.PICC_HaltA();
}