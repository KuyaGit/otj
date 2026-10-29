// Jeep dash simulator for Tinkercad Circuits (Arduino Uno R3).
//
// Stands in for the ESP32-S3 JeepDash from the guide: five gauges, the alarms and the buzzer.
// It also has dash switches for the hazard lights, fog lights and a few accessories. There are no
// headlight, brake or turn signal circuits in it.
// Potentiometers play the sensors, push buttons play the switches, LEDs play the loads.
// Wiring and a test script: docs/tinkercad/README.md
//
// Values marked "guide" come from the JeepDash calibration defaults and the charging notes.
// Values marked "assumed" are not in the guide, so change them freely.

#include <LiquidCrystal.h>

// ------------------------------------------------------------------ pins
const uint8_t PIN_COOLANT = A0;
const uint8_t PIN_OIL     = A1;
const uint8_t PIN_BATT    = A2;
const uint8_t PIN_FUEL    = A3;
const uint8_t PIN_RPM     = A4;
const uint8_t PIN_SWITCHES = A5;   // all six buttons share this pin through a resistor ladder
const uint8_t PIN_LED_HAZARD = 2;
const uint8_t PIN_LED_FOG    = 3;
const uint8_t PIN_LED_BAR    = 4;
const uint8_t PIN_LED_WIPER  = 5;
const uint8_t PIN_BUZZER     = 6;
const uint8_t PIN_LED_HORN   = 13;

LiquidCrystal lcd(12, 11, 10, 9, 8, 7);   // RS, E, D4, D5, D6, D7

// ------------------------------------------------------------------ settings
// guide: JeepDash calibration defaults
const float NTC_R25      = 10000.0;   // coolant sensor ohms at 25 C
const float NTC_BETA     = 3950.0;
const float NTC_PULLUP   = 1000.0;    // ohms from the supply to the sensor junction
const float OIL_PSI_MAX  = 100.0;     // 0.5-4.5 V transducer
const float FUEL_V_EMPTY = 7.0;       // sender wire volts, the guide's "not measured yet" defaults
const float FUEL_V_FULL  = 1.0;
const float TEMP_WARN_C  = 100.0;
const unsigned long FAULT_HOLD_MS = 3000;   // "OIL SENSOR?" appears after 3 seconds

// guide: charging notes (below about 13.2 V at idle, above about 14.8 V is a bad regulator)
const float BATT_LOW_V  = 13.2;
const float BATT_HIGH_V = 14.8;

// assumed
const float OIL_WARN_PSI       = 10.0;
const int   ENGINE_RUNNING_RPM = 500;
const int   PULSES_PER_REV     = 2;      // 4 cylinders, one coil: two sparks per revolution
const unsigned long ALARM_HOLD_MS = 1000;
const int   HORN_HZ = 400;

// What a full turn of each potentiometer stands for. The real build divides 12 V down for the
// ESP32 ADC; the Uno reads up to 5 V, so the simulator just rescales instead.
const float ADC_VREF       = 5.0;
const float BATT_POT_MAX_V = 20.0;
const float FUEL_POT_MAX_V = 8.0;
const int   RPM_POT_MAX    = 6000;

const unsigned long FLASH_HALF_MS = 330;    // hazard flasher, about 90 flashes a minute
const unsigned long PAGE_MS       = 1500;   // how long each LCD page stays up

// ------------------------------------------------------------------ switches
// Six push buttons on one analog pin. Each button joins the pin to ground through its own
// resistor, with a 10k pull-up to 5V, so each one gives a different voltage.
enum { SW_NONE, SW_HAZARD, SW_FOG, SW_BAR, SW_WIPER, SW_HORN, SW_MUTE, SW_COUNT };
const long LADDER_PULLUP = 10000;
const long LADDER_OHMS[SW_COUNT - 1] = { 0, 1000, 2200, 4700, 10000, 22000 };

// Which button is down, from the raw reading: the nearest expected value wins
uint8_t decodeSwitch(int raw) {
  uint8_t best = SW_NONE;
  int bestGap = 1023 - raw;   // distance from "nothing pressed"
  for (uint8_t i = 0; i < SW_COUNT - 1; i++) {
    int expect = (int)(1023L * LADDER_OHMS[i] / (LADDER_PULLUP + LADDER_OHMS[i]));
    int gap = abs(raw - expect);
    if (gap < bestGap) { bestGap = gap; best = i + 1; }
  }
  return best;
}

uint8_t swRaw = SW_NONE;        // what the pin says right now
uint8_t swHeld = SW_NONE;       // the debounced button
uint8_t swPressed = SW_NONE;    // set for one loop when a button goes down
unsigned long swChangedAt = 0;

bool hazard = false;
bool fog = false;
bool lightBar = false;
bool wipers = false;
bool horn = false;              // only while the horn button is held
bool muted = false;

void updateSwitches() {
  uint8_t now = decodeSwitch(analogRead(PIN_SWITCHES));
  if (now != swRaw) { swRaw = now; swChangedAt = millis(); }
  swPressed = SW_NONE;
  if (swRaw != swHeld && millis() - swChangedAt >= 30) {
    swHeld = swRaw;
    if (swHeld != SW_NONE) swPressed = swHeld;
  }
  horn = swHeld == SW_HORN;

  if (swPressed == SW_HAZARD) hazard = !hazard;
  if (swPressed == SW_FOG)    fog = !fog;
  if (swPressed == SW_BAR)    lightBar = !lightBar;
  if (swPressed == SW_WIPER)  wipers = !wipers;
}

// ------------------------------------------------------------------ sensors
struct Readings {
  float tempC;  bool tempFault;
  float oilPsi; bool oilFault;
  int   rpm;
  float battV;
  float fuelV;  int fuelPct;
};
Readings r = { 0, false, 0, false, 0, 0, 0, 0 };

int readAvg(uint8_t pin) {
  long sum = 0;
  for (uint8_t i = 0; i < 8; i++) sum += analogRead(pin);
  return (int)(sum / 8);
}

void readSensors() {
  // Coolant: NTC to ground under a pull-up. An unplugged sensor pulls the junction to the rail.
  int c = readAvg(PIN_COOLANT);
  r.tempFault = c < 20 || c > 1003;
  if (!r.tempFault) {
    float v = c * ADC_VREF / 1023.0;
    float ohms = NTC_PULLUP * v / (ADC_VREF - v);
    r.tempC = 1.0 / (1.0 / 298.15 + log(ohms / NTC_R25) / NTC_BETA) - 273.15;
  }

  // Oil: 0.5-4.5 V is 0 to OIL_PSI_MAX. Outside 0.25-4.75 V the sensor is unplugged or shorted.
  float ov = readAvg(PIN_OIL) * ADC_VREF / 1023.0;
  r.oilFault = ov < 0.25 || ov > 4.75;
  r.oilPsi = constrain((ov - 0.5) / 4.0 * OIL_PSI_MAX, 0.0, OIL_PSI_MAX);

  r.battV = readAvg(PIN_BATT) * BATT_POT_MAX_V / 1023.0;

  r.fuelV = readAvg(PIN_FUEL) * FUEL_POT_MAX_V / 1023.0;
  r.fuelPct = (int)constrain((r.fuelV - FUEL_V_EMPTY) / (FUEL_V_FULL - FUEL_V_EMPTY) * 100.0 + 0.5, 0.0, 100.0);

  // The real build counts coil pulses on the optocoupler. Here a pot sets the RPM directly.
  r.rpm = (int)(((long)readAvg(PIN_RPM) * RPM_POT_MAX / 1023L) / 10L * 10L);
}

// ------------------------------------------------------------------ alarms
enum { AL_OIL_LOW, AL_HOT, AL_NO_CHARGE, AL_OVERCHARGE, AL_OIL_SENSOR, AL_TEMP_SENSOR, AL_COUNT };
const char* const ALARM_TEXT[AL_COUNT] = {
  "LOW OIL PRESSURE", "ENGINE HOT", "NOT CHARGING", "OVERCHARGING", "OIL SENSOR?", "TEMP SENSOR?"
};

bool alarmOn[AL_COUNT];
bool alarmPending[AL_COUNT];
unsigned long alarmSince[AL_COUNT];
uint8_t activeCount = 0;

// An alarm only fires once its condition has held for holdMs, so a blip does not beep.
void setAlarm(uint8_t a, bool cond, unsigned long holdMs) {
  if (!cond) { alarmPending[a] = false; alarmOn[a] = false; return; }
  if (!alarmPending[a]) { alarmPending[a] = true; alarmSince[a] = millis(); }
  if (millis() - alarmSince[a] >= holdMs) alarmOn[a] = true;
}

void evaluateAlarms() {
  bool running = r.rpm >= ENGINE_RUNNING_RPM;
  setAlarm(AL_OIL_SENSOR,  r.oilFault, FAULT_HOLD_MS);
  setAlarm(AL_TEMP_SENSOR, r.tempFault, FAULT_HOLD_MS);
  setAlarm(AL_OIL_LOW,     running && !r.oilFault && r.oilPsi < OIL_WARN_PSI, ALARM_HOLD_MS);
  setAlarm(AL_HOT,         !r.tempFault && r.tempC >= TEMP_WARN_C, ALARM_HOLD_MS);
  setAlarm(AL_NO_CHARGE,   running && r.battV < BATT_LOW_V, ALARM_HOLD_MS);
  setAlarm(AL_OVERCHARGE,  running && r.battV > BATT_HIGH_V, ALARM_HOLD_MS);

  activeCount = 0;
  for (uint8_t i = 0; i < AL_COUNT; i++) if (alarmOn[i]) activeCount++;
  if (activeCount == 0) muted = false;   // the mute lasts until the problem clears
}

int toneNow = 0;

// The one piezo is both the alarm buzzer and the horn. The horn wins while its button is held.
void updateBuzzer() {
  int want = 0;
  if (horn) want = HORN_HZ;
  else if (activeCount > 0 && !muted && (millis() % 1000UL) < 200UL) want = 2000;
  if (want != toneNow) {
    if (want) tone(PIN_BUZZER, want); else noTone(PIN_BUZZER);
    toneNow = want;
  }
}

// ------------------------------------------------------------------ accessories
void updateLoads() {
  bool flashOn = (millis() / FLASH_HALF_MS) % 2 == 0;
  digitalWrite(PIN_LED_HAZARD, (hazard && flashOn) ? HIGH : LOW);
  digitalWrite(PIN_LED_FOG, fog ? HIGH : LOW);
  digitalWrite(PIN_LED_BAR, lightBar ? HIGH : LOW);
  digitalWrite(PIN_LED_WIPER, wipers ? HIGH : LOW);
  digitalWrite(PIN_LED_HORN, horn ? HIGH : LOW);
}

// ------------------------------------------------------------------ display
void showLines(const char* top, const char* bottom) {
  char buf[17];
  snprintf(buf, sizeof buf, "%-16s", top);
  lcd.setCursor(0, 0);
  lcd.print(buf);
  snprintf(buf, sizeof buf, "%-16s", bottom);
  lcd.setCursor(0, 1);
  lcd.print(buf);
}

// The screen rotates through three pages. While an alarm is active, an alarm page is slotted in
// between them, one alarm at a time.
void drawDisplay() {
  char a[17], b[17];
  unsigned long slot = millis() / PAGE_MS;

  if (activeCount > 0 && slot % 2 == 0) {
    uint8_t want = (uint8_t)((slot / 2) % activeCount), seen = 0;
    for (uint8_t i = 0; i < AL_COUNT; i++) {
      if (!alarmOn[i]) continue;
      if (seen++ == want) { showLines(ALARM_TEXT[i], muted ? "MUTED" : "PRESS MUTE"); return; }
    }
  }

  uint8_t page = (uint8_t)((activeCount > 0 ? slot / 2 : slot) % 3);
  if (page == 0) {
    if (r.tempFault) snprintf(a, sizeof a, "COOLANT    ---");
    else snprintf(a, sizeof a, "COOLANT %4d C", (int)floor(r.tempC + 0.5));
    if (r.oilFault) snprintf(b, sizeof b, "OIL        ---");
    else snprintf(b, sizeof b, "OIL     %4d psi", (int)(r.oilPsi + 0.5));
  } else if (page == 1) {
    int tenths = (int)(r.battV * 10.0 + 0.5);
    snprintf(a, sizeof a, "RPM     %4d", r.rpm);
    snprintf(b, sizeof b, "BATTERY %2d.%1d V", tenths / 10, tenths % 10);
  } else {
    // second line lists the switches that are on
    snprintf(a, sizeof a, "FUEL    %4d %%", r.fuelPct);
    snprintf(b, sizeof b, "%s %s %s %s", hazard ? "HAZ" : "   ", fog ? "FOG" : "   ",
             lightBar ? "BAR" : "   ", wipers ? "WIP" : "   ");
  }
  showLines(a, b);
}

void printStatus() {
  Serial.print(F("temp "));
  if (r.tempFault) Serial.print(F("FAULT")); else Serial.print(r.tempC, 1);
  Serial.print(F(" C | oil "));
  if (r.oilFault) Serial.print(F("FAULT")); else Serial.print(r.oilPsi, 1);
  Serial.print(F(" psi | rpm "));
  Serial.print(r.rpm);
  Serial.print(F(" (coil "));
  Serial.print((long)r.rpm * PULSES_PER_REV / 60L);
  Serial.print(F(" Hz) | batt "));
  Serial.print(r.battV, 1);
  Serial.print(F(" V | fuel "));
  Serial.print(r.fuelPct);
  Serial.print(F(" % (sender "));
  Serial.print(r.fuelV, 2);
  Serial.print(F(" V) | on:"));
  if (hazard) Serial.print(F(" hazard"));
  if (fog) Serial.print(F(" fog"));
  if (lightBar) Serial.print(F(" lightbar"));
  if (wipers) Serial.print(F(" wipers"));
  if (horn) Serial.print(F(" horn"));
  if (!hazard && !fog && !lightBar && !wipers && !horn) Serial.print(F(" none"));
  Serial.print(F(" | alarms "));
  if (activeCount == 0) Serial.print(F("none"));
  for (uint8_t i = 0; i < AL_COUNT; i++) {
    if (!alarmOn[i]) continue;
    Serial.print(ALARM_TEXT[i]);
    Serial.print(' ');
  }
  if (muted) Serial.print(F("(muted)"));
  Serial.println();
}

// ------------------------------------------------------------------ main
void setup() {
  Serial.begin(9600);
  lcd.begin(16, 2);

  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);   // silent while the board boots
  pinMode(PIN_LED_HAZARD, OUTPUT);
  pinMode(PIN_LED_FOG, OUTPUT);
  pinMode(PIN_LED_BAR, OUTPUT);
  pinMode(PIN_LED_WIPER, OUTPUT);
  pinMode(PIN_LED_HORN, OUTPUT);

  showLines("JEEP DASH SIM", "starting...");
  tone(PIN_BUZZER, 2000, 120);     // boot chirp
  delay(300);
  readSensors();
}

void loop() {
  static unsigned long lastSensors = 0, lastLcd = 0, lastSerial = 0;
  unsigned long now = millis();

  updateSwitches();
  if (swPressed == SW_MUTE && activeCount > 0) muted = true;
  if (now - lastSensors >= 100) {
    lastSensors = now;
    readSensors();
    evaluateAlarms();
  }
  updateLoads();
  updateBuzzer();

  if (now - lastLcd >= 250) {
    lastLcd = now;
    drawDisplay();
  }
  if (now - lastSerial >= 1000) {
    lastSerial = now;
    printStatus();
  }
}
