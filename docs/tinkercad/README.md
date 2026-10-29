# Jeep dash simulator for Tinkercad Circuits

A bench model of the **JeepDash** from this guide on one Arduino Uno R3: five gauges (coolant,
oil pressure, RPM, battery, fuel), the alarms and buzzer, plus dash switches for the **hazard
lights, fog lights, LED light bar, wipers and horn**. There are no headlight, brake light or turn
signal circuits in it.

It is a model, not the real build. Tinkercad has no ESP32-S3, ADS1115 or optocoupler, so the Uno
stands in for the board and potentiometers stand in for the sensors. The sketch uses the guide's
own numbers where it has them. There is no circuit file to import, so you build the circuit once
by hand in Tinkercad and paste the sketch in.

## What stands in for what

| Real build | In the simulator |
|---|---|
| ESP32-S3 touch screen | Uno + 16x2 LCD (pages rotate) and the Serial Monitor |
| Coolant NTC, 1 kΩ pull-up, ADS1115 `A0` | Pot on `A0`, same NTC maths (10 kΩ, beta 3950, 1 kΩ pull-up) |
| Oil transducer 0.5–4.5 V = 0–100 psi | Pot on `A1`, same scaling |
| Battery 100 kΩ / 22 kΩ divider | Pot on `A2`: full turn = 20 V |
| Fuel sender 100 kΩ / 22 kΩ divider | Pot on `A3`: full turn = 8 V at the sender; 7.0 V = empty, 1.0 V = full (the guide's uncalibrated defaults) |
| Coil pulses through the PC817 on GPIO 6 | Pot on `A4`: full turn = 6000 RPM. The Serial Monitor shows the coil frequency that RPM would give (2 sparks per rev) |
| Buzzer, 1 kΩ, 2N2222, 10 kΩ pull-down | The same circuit, with a piezo. The horn uses it too |
| Tap the top bar to mute | A **Mute** button |
| Dash switches and relays | Push buttons and LEDs (the LED is the load) |

The 100 kΩ / 22 kΩ dividers exist to bring 12 V down to the ESP32's 3.3 V ADC. The Uno reads
5 V, so the sketch rescales instead (`BATT_POT_MAX_V`, `FUEL_POT_MAX_V` at the top of the sketch).

## Parts (Tinkercad Components panel)

| Qty | Part | Notes |
|---|---|---|
| 1 | Arduino Uno R3 | |
| 5 | Potentiometer | Set each to 10 kΩ. Coolant, oil, battery, fuel, RPM |
| 6 | Pushbutton | Hazard, fog, light bar, wipers, horn, mute |
| 1 | LCD 16 x 2 | The plain parallel one, not the I2C one |
| 5 | LED | Hazard, fog, light bar, wipers, horn. Any colours, for example yellow for fog |
| 5 | Resistor 220 Ω | One per LED |
| 1 | Resistor 220 Ω | LCD backlight |
| 1 | Piezo | Alarm buzzer and horn |
| 1 | NPN Transistor (BJT) | The 2N2222 stand-in |
| 1 | Resistor 1 kΩ | Transistor base |
| 1 | Resistor 10 kΩ | Transistor base pull-down |
| 1 | Resistor 10 kΩ | Switch ladder pull-up |
| 1 | Resistor 1 kΩ | Fog button |
| 1 | Resistor 2.2 kΩ | Light bar button |
| 1 | Resistor 4.7 kΩ | Wipers button |
| 1 | Resistor 10 kΩ | Horn button |
| 1 | Resistor 22 kΩ | Mute button |

## Wiring

Use the Uno's `5V` and `GND` pins, and the breadboard rails to share them.

**Potentiometers** (all five the same way): outer pin 1 to `5V`, outer pin 3 to `GND`, middle pin
(the wiper) to the Uno pin below.

| Pot | Uno pin |
|---|---|
| Coolant | `A0` |
| Oil pressure | `A1` |
| Battery | `A2` |
| Fuel | `A3` |
| RPM | `A4` |

**Switches.** All six buttons share one input, `A5`, so they need only that pin. This is a
resistor ladder: each button connects `A5` to `GND` through its own resistor, so each one gives a
different voltage and the sketch can tell them apart.

1. Connect a 10 kΩ resistor from `5V` to `A5` (the pull-up).
2. For each button, wire one leg to `A5`. Wire the diagonally opposite leg to `GND` through the
   resistor in the table (the hazard button goes straight to `GND`, with no resistor).

| Button | Resistor to `GND` |
|---|---|
| Hazard | none (a wire) |
| Fog lights | 1 kΩ |
| LED light bar | 2.2 kΩ |
| Wipers | 4.7 kΩ |
| Horn | 10 kΩ |
| Mute | 22 kΩ |

Press one button at a time. Two held together join their resistors and can be read as a third button.

**Loads**: Uno pin → 220 Ω → LED anode (long leg); LED cathode → `GND`.

| Load | Uno pin |
|---|---|
| Hazard lights | `D2` |
| Fog lights | `D3` |
| LED light bar | `D4` |
| Wipers | `D5` |
| Horn | `D13` |

**Buzzer**: `D6` → 1 kΩ → transistor base. Transistor emitter → `GND`. 10 kΩ from base to `GND`.
Piezo `+` → `5V`, piezo `–` → transistor collector.

**LCD 16 x 2**:

| LCD pin | Connect to |
|---|---|
| VSS | `GND` |
| VDD | `5V` |
| VO | `GND` |
| RS | `D12` |
| RW | `GND` |
| E | `D11` |
| D4 | `D10` |
| D5 | `D9` |
| D6 | `D8` |
| D7 | `D7` |
| A (backlight +) | 220 Ω → `5V` |
| K (backlight –) | `GND` |
| D0–D3 | not connected |

## Run it

1. Open the **Code** panel, switch to **Text**, delete the template and paste
   `jeep-dash-sim/jeep-dash-sim.ino`.
2. Open the **Serial Monitor** under the code panel.
3. **Set the pots before Start Simulation.** A pot left at half travel reads as a 3000 RPM engine
   on a 10 V battery, which trips NOT CHARGING straight away.

The LCD rotates through three pages every 1.5 s: coolant and oil; RPM and battery; fuel, with the
switches that are on listed underneath (`HAZ`, `FOG`, `BAR`, `WIP`). An active alarm gets its own
page between them. The Serial Monitor prints one full status line per second.

## Test script

Pot positions are the fraction of full travel, 0 at the `GND` end. They follow the guide's
alarm-testing phase.

| Do this | Pots (coolant / oil / battery / fuel / RPM) | You should see |
|---|---|---|
| Key on, engine off | 0.91 / 0.10 / 0.63 / 0.50 / 0 | Coolant 25 °C, oil 0 psi, 12.6 V, no alarm |
| Engine running | 0.55 / 0.30 / 0.70 / 0.50 / 0.15 | 81 °C, 25 psi, 14.0 V, about 890 RPM, no alarm |
| Overheat | coolant to 0.40 | 102 °C, after 1 s **ENGINE HOT** and the buzzer |
| Low oil | oil to 0.15 | 6 psi, **LOW OIL PRESSURE** (engine must be running) |
| Dead alternator | battery to 0.60 | 12.0 V, **NOT CHARGING** |
| Bad regulator | battery to 0.76 | 15.2 V, **OVERCHARGING** |
| Unplug the oil sensor | oil to 0 | after 3 s **OIL SENSOR?** |
| Unplug the coolant sensor | coolant to 1.0 | after 3 s **TEMP SENSOR?** |
| Empty / full tank | fuel to 0.875 / 0.125 | 0 % / 100 % |
| Mute | click **Mute** during an alarm | Buzzer stops, banner shows MUTED until the problem clears |

Coolant reads 100 °C at 0.411. Turn the coolant pot toward 0 to heat the engine; toward 1.0 is cold.

**Switches**

- Hazard: click to turn on or off. The LED flashes. In the real circuit this works with the key
  off, so the simulator has no ignition switch to model.
- Fog lights, light bar, wipers: click to turn on, click again to turn off. Each LED stays lit and
  the LCD lists it.
- Horn: the LED and a 400 Hz tone run only while you hold the button. The horn overrides an alarm
  beep for as long as it is held.

## Assumed values

The guide does not give these, so they are guesses at sensible numbers. Change them at the top
of the sketch.

| Setting | Value | Why |
|---|---|---|
| `OIL_WARN_PSI` | 10 | The guide has no low-oil threshold |
| `ENGINE_RUNNING_RPM` | 500 | Oil and charging alarms only apply when running, so a key-on, engine-off dash stays quiet |
| `PULSES_PER_REV` | 2 | 4 cylinders, one coil |
| `ALARM_HOLD_MS` | 1000 | A condition must hold for 1 s, so a flicker does not beep |
| `HORN_HZ` | 400 | A horn-like note on the piezo |

The fog light, light bar, wiper and horn switches are not from `jeepdash-phases.ts`. They are
simple on/off loads picked from the accessories in this guide (fog lights are not one of its
circuits).

From the guide: coolant sensor 10 kΩ / beta 3950, 100 °C warning, 0–100 psi oil, fuel 7.0 V empty and
1.0 V full, the 3 s sensor-fault delay, and the 13.2 V / 14.8 V charging limits.

## If something looks wrong

- **LCD is blank or shows boxes**: wire VO to the wiper of a 10 kΩ pot (ends to `5V` and `GND`) instead of `GND`.
- **No sound**: connect the piezo straight between `D6` and `GND`, skipping the transistor.
- **Pots read wrong**: check the wiper is the middle pin, and that the pot is set to a resistance (10 kΩ) and not left at its default.
- **A button does the wrong thing, or nothing**: check its resistor value against the table, and
  that the 10 kΩ pull-up runs from `5V` to `A5`. The Serial Monitor shows `on:` for whichever
  switches are active.
