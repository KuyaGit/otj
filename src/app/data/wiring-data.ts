import type { IconName } from '../components/icon/icons';

export interface CircuitStage {
  label: string;
  sub?: string;
  icon?: IconName;
}

export interface Circuit {
  id: string;
  name: string;
  category: string;
  wireGauge: string;
  fuse: string;
  icon?: IconName;
  diagram: CircuitStage[];
  groundDiagram?: CircuitStage[];
  notes?: string[];
  table?: { label: string; wire: string; fuse: string }[];
}

export interface Category {
  id: string;
  name: string;
  icon: IconName;
}

export const CATEGORIES: Category[] = [
  { id: 'core', name: 'Core / Main Feed', icon: 'battery' },
  { id: 'starting', name: 'Starting & Ignition', icon: 'key' },
  { id: 'fuel', name: 'Fuel System', icon: 'fuel' },
  { id: 'lighting', name: 'Lighting', icon: 'bulb' },
  { id: 'signals', name: 'Signals & Horn', icon: 'horn' },
  { id: 'cooling', name: 'Cooling', icon: 'fan' },
  { id: 'interior', name: 'Interior & Accessories', icon: 'dashboard' },
  { id: 'audio', name: 'Audio', icon: 'speaker' },
  { id: 'gauges', name: 'Gauges', icon: 'gauge' },
];

export const CIRCUITS: Circuit[] = [
  {
    id: 'main-feed',
    name: 'Battery / Main Fuse / Relay Panel',
    category: 'core',
    wireGauge: '4 AWG (battery to main fuse box)',
    fuse: '60–100A main fuse',
    icon: 'battery',
    diagram: [
      { label: 'Battery (+)' },
      { label: 'Main battery cable', sub: '4 AWG' },
      { label: 'Main fuse', sub: '60–100A, near battery' },
      { label: 'Main fuse / relay panel' },
      { label: 'Individual fused circuits' },
      { label: 'Relays (high-current loads)' },
      { label: 'Accessories' },
    ],
    groundDiagram: [
      { label: 'Battery (–)' },
      { label: 'Heavy chassis ground', sub: '4 AWG' },
      { label: 'Heavy engine ground', sub: '4 AWG' },
      { label: 'Body/chassis ground strap', sub: '10 AWG' },
    ],
    notes: [
      'Place the main fuse as close to the battery positive terminal as practical — its job is to protect the main feed cable.',
      'Use a central fuse/relay panel instead of routing high-current loads through dashboard switches.',
    ],
    table: [
      { label: 'Battery → main fuse box', wire: '4 AWG', fuse: '60–100A' },
      { label: 'Battery → starter', wire: '2–4 AWG', fuse: 'Usually none' },
      { label: 'Battery negative → chassis', wire: '4 AWG', fuse: '—' },
      { label: 'Engine → chassis ground', wire: '4–6 AWG', fuse: '—' },
      { label: 'Body → chassis ground', wire: '8–10 AWG', fuse: '—' },
      { label: 'Alternator → battery', wire: '6–8 AWG', fuse: '40–80A' },
    ],
  },
  {
    id: 'charging-system',
    name: 'Charging System (AC Alternator)',
    category: 'core',
    wireGauge: '6–8 AWG (alternator B+ to battery)',
    fuse: '40–80A (by alternator rating)',
    icon: 'battery',
    diagram: [
      { label: 'Alternator B+', sub: 'AC alternator, rectified to DC' },
      { label: 'Charge cable', sub: '6–8 AWG' },
      { label: 'Alternator fuse / fusible link', sub: '40–80A' },
      { label: 'Battery (+)' },
      { label: 'Main fuse / relay panel' },
    ],
    groundDiagram: [
      { label: 'Alternator case / engine block' },
      { label: 'Engine → chassis ground', sub: '4–6 AWG' },
      { label: 'Battery (–)' },
      { label: 'Battery → chassis ground', sub: '4 AWG' },
    ],
    notes: [
      'Engine off, battery rested: about 12.6V. Engine running with lights and accessories on, at idle and about 2000 RPM: 13.8–14.4V. LEDs are designed for this range, not a flat 12.0V.',
      'Below about 13.2V at idle: check belt tension, idle RPM, pulley size, and alternator amps against the total load. Above about 14.8V: the regulator is faulty and will burn out LEDs.',
      'Ripple test: set the multimeter to AC volts and measure across the battery with the engine running. More than about 0.5V AC points to a bad rectifier diode, the classic cause of LED flicker — repair or replace the alternator.',
      'Voltage-drop test with lights on: alternator B+ to battery (+) should read under 0.3V, and alternator case to battery (–) under 0.2V. Higher readings mean undersized cable or a bad ground.',
      'If the alternator has an external regulator, check the regulator ground and its sense wire.',
      'If the voltage-drop test fails, do the Big 3 Upgrade (see that page) before blaming the alternator.',
      'Do not add a capacitor to each LED accessory. A capacitor cannot raise a low supply or hold up a sagging system — fix the charging system and voltage drop first.',
    ],
    table: [
      { label: 'Alternator B+ → battery', wire: '6–8 AWG', fuse: '40–80A' },
      { label: 'Battery negative → chassis', wire: '4 AWG', fuse: '—' },
      { label: 'Engine → chassis ground', wire: '4–6 AWG', fuse: '—' },
      { label: 'Alternator output vs. load', wire: 'Rated amps ≥ total accessory load + ~20%', fuse: '—' },
    ],
  },
  {
    id: 'big-3-upgrade',
    name: 'Big 3 Upgrade',
    category: 'core',
    wireGauge: '4 AWG (all three cables)',
    fuse: 'Alternator output rating, fused near the battery',
    icon: 'wire',
    diagram: [
      { label: 'Alternator B+', sub: 'rectified DC output' },
      { label: 'New charge cable', sub: '4 AWG' },
      { label: 'Fuse / fusible link', sub: 'rated for the alternator, close to the battery' },
      { label: 'Battery (+)' },
    ],
    groundDiagram: [
      { label: 'Battery (–)' },
      { label: 'New battery ground', sub: '4 AWG' },
      { label: 'Chassis ground point', sub: 'bare metal' },
      { label: 'New engine ground', sub: '4 AWG' },
      { label: 'Engine block' },
    ],
    notes: [
      'The Big 3 are the three main cables that carry all charging current: alternator positive to battery positive, battery negative to chassis, and engine block to chassis. Upgrading all three cuts voltage drop, which is what makes LEDs dim and flicker.',
      'Do it when the voltage-drop test in the Charging System page fails: more than 0.3V from alternator B+ to battery (+), or more than 0.2V from the alternator case or battery (–) to chassis, with the lights on. Repeat the test afterwards to confirm the improvement.',
      'Fuse the new charge cable close to the battery, rated for the alternator output. A fuse or fusible link here protects the cable if it shorts.',
      'Grind or sand paint and rust to bare metal at every chassis and engine contact, use properly crimped or soldered lugs with heat shrink, and seal the finished joint against moisture.',
      'Optional: add a short strap from the alternator case to the engine block, so the alternator is not relying on its bracket for the ground.',
      'Disconnect the battery negative before working on any of the three cables, and route them away from heat, sharp edges and moving parts.',
    ],
    table: [
      { label: 'Alternator B+ → battery (+)', wire: '4 AWG (stock 6–8 AWG)', fuse: 'Alternator output rating' },
      { label: 'Battery (–) → chassis', wire: '4 AWG', fuse: '—' },
      { label: 'Engine block → chassis', wire: '4 AWG (stock 4–6 AWG)', fuse: '—' },
      { label: 'Alternator case → engine block (optional)', wire: '4–6 AWG', fuse: '—' },
    ],
  },
  {
    id: 'starter',
    name: 'Starter Circuit',
    category: 'starting',
    wireGauge: '2–4 AWG (battery to starter B+)',
    fuse: 'Usually no conventional fuse',
    icon: 'starter',
    diagram: [
      { label: 'Battery (+)' },
      { label: 'Heavy cable', sub: '2–4 AWG' },
      { label: 'Starter B+' },
    ],
    notes: [
      'Ignition switch → starter relay: 14–16 AWG.',
      'Starter relay output → starter solenoid: 14–16 AWG.',
      'Never route starter motor current through the ignition switch — use a relay/solenoid.',
    ],
  },
  {
    id: 'ignition-carbureted',
    name: 'Ignition (Carbureted 4K)',
    category: 'starting',
    wireGauge: '14–16 AWG (see breakdown)',
    fuse: '10–15A per sub-circuit',
    icon: 'spark',
    diagram: [
      { label: 'Ignition switch' },
      { label: 'Ignition relay', sub: '14 AWG · 15A fuse' },
      { label: 'Coil / module / distributor / choke' },
    ],
    notes: [
      'Ignition coil positive: 14 AWG, 10–15A fuse.',
      'Ignition module: 16 AWG, 10A fuse.',
      'Distributor: 16 AWG, 10A fuse.',
      'Electric choke: 16 AWG, 10A fuse.',
      'If converted to EFI, wiring should be designed around that specific EFI system instead.',
    ],
  },
  {
    id: 'fuel-pump',
    name: 'Electric Fuel Pump',
    category: 'fuel',
    wireGauge: '16–12 AWG (by pump current)',
    fuse: '7.5–20A (by pump current)',
    icon: 'pump',
    diagram: [
      { label: 'Battery (+)' },
      { label: 'Fuse', sub: 'per pump size' },
      { label: 'Relay' },
      { label: 'Fuel pump (+)' },
      { label: 'Fuel pump (–)', sub: 'to chassis/ground' },
    ],
    notes: ['Manufacturer fuse specification should take priority over these starting points.'],
    table: [
      { label: 'Pump ≤5A', wire: '16 AWG', fuse: '7.5–10A' },
      { label: 'Pump 5–10A', wire: '14 AWG', fuse: '15A' },
      { label: 'Pump 10–15A', wire: '12 AWG', fuse: '20A' },
    ],
  },
  {
    id: 'headlight-low',
    name: 'Headlights — Low Beam',
    category: 'lighting',
    wireGauge: '12 AWG',
    fuse: '20A',
    icon: 'headlight-low',
    diagram: [
      { label: 'Battery (+)' },
      { label: '20A fuse' },
      { label: 'Low-beam relay' },
      { label: 'Low beam lamps' },
    ],
    notes: ['Dashboard headlight switch only triggers the relay — it does not carry lamp current.'],
  },
  {
    id: 'headlight-high',
    name: 'Headlights — High Beam',
    category: 'lighting',
    wireGauge: '12 AWG',
    fuse: '20A',
    icon: 'headlight-high',
    diagram: [
      { label: 'Battery (+)' },
      { label: '20A fuse' },
      { label: 'High-beam relay' },
      { label: 'High beam lamps' },
    ],
    notes: ['Dashboard headlight switch only triggers the relay — it does not carry lamp current.'],
  },
  {
    id: 'led-accessory-power',
    name: 'LED Lights / Light Bars (Stable Power)',
    category: 'lighting',
    wireGauge: '16 AWG (14 AWG for long runs / >8A)',
    fuse: '10–15A (by total LED load)',
    icon: 'bulb',
    diagram: [
      { label: 'Battery (+)' },
      { label: 'Fuse', sub: '10–15A, per LED group' },
      { label: 'Relay', sub: 'switch only triggers the coil' },
      { label: '12V DC-DC stabilizer', sub: 'optional · buck-boost 8–40V in → 12V out' },
      { label: 'LED lights / light bars' },
    ],
    groundDiagram: [
      { label: 'LED (–)' },
      { label: 'Short ground lead' },
      { label: 'Clean chassis point / ground bus' },
      { label: 'Battery (–)' },
    ],
    notes: [
      'Do not add a capacitor to each LED. It cannot fix a low or unstable supply — fix the charging system and voltage drop first (see Charging System).',
      'Prefer LEDs rated 9–32V or 10–30V with a constant-current driver. Their brightness stays steady from 12V to 14.4V, so they need no stabilizer.',
      'Use a stabilizer only for driverless LED strips or modules that are strictly 12V. Size it for at least 1.5× the group current, use one per LED group (not one per lamp), and mount it where it gets airflow.',
      'Do not put headlights on the stabilizer — they have their own relay circuits.',
      'Never route LED bar current through the dashboard switch; use it only to trigger the relay.',
    ],
    table: [
      { label: 'LED group ≤5A', wire: '16 AWG', fuse: '7.5–10A' },
      { label: 'LED group 5–10A', wire: '14 AWG', fuse: '15A' },
      { label: 'LED group 10–15A', wire: '12 AWG', fuse: '20A' },
    ],
  },
  {
    id: 'tail-park',
    name: 'Parking / Tail Lights',
    category: 'lighting',
    wireGauge: '16 AWG',
    fuse: '10A',
    icon: 'taillight',
    diagram: [
      { label: 'Light switch' },
      { label: '10A fuse' },
      { label: 'Tail / park / plate lights' },
    ],
  },
  {
    id: 'brake-lights',
    name: 'Brake Lights',
    category: 'lighting',
    wireGauge: '16 AWG',
    fuse: '10A',
    icon: 'brake',
    diagram: [
      { label: '10A fuse' },
      { label: 'Brake switch' },
      { label: 'Left / right brake lamps' },
    ],
  },
  {
    id: 'turn-signals',
    name: 'Turn Signals',
    category: 'signals',
    wireGauge: '16 AWG',
    fuse: '10A (15A for hazard load)',
    icon: 'turn-signal',
    diagram: [
      { label: '10A fuse' },
      { label: 'Flasher' },
      { label: 'Turn signal switch' },
      { label: 'Left / right lamps' },
    ],
    notes: ['Hazards are wired as their own circuit with a dash switch: see Hazard Lights.'],
  },
  {
    id: 'hazard-lights',
    name: 'Hazard Lights (Dash Switch)',
    category: 'signals',
    wireGauge: '16 AWG',
    fuse: '15A',
    icon: 'hazard',
    diagram: [
      { label: 'Battery (+)' },
      { label: '15A fuse', sub: 'constant power, works with the key off' },
      { label: 'Hazard flasher', sub: 'heavy-duty / electronic, rated for 4+ lamps' },
      { label: 'Hazard switch', sub: 'multi-pole, on the dash' },
      { label: 'Left + right turn lamps' },
    ],
    notes: [
      'The feed is constant battery power, not ignition-switched, so the hazards work with the key off.',
      'The multi-pole switch does two jobs. One pole disconnects the turn flasher, and the other poles connect the hazard flasher to both the left and right lamp lines, so the two flashers never back-feed each other.',
      'Use a heavy-duty or electronic (LED-compatible) flasher rated for the full lamp count. A standard turn flasher will blink fast or not at all.',
      'The lamp wiring is the same green 16 AWG as the turn signals (see Turn Signals). The switch only taps those wires.',
    ],
    table: [
      { label: 'Battery → fuse → flasher', wire: '16 AWG', fuse: '15A' },
      { label: 'Flasher → hazard switch', wire: '16 AWG', fuse: '—' },
      { label: 'Switch → left lamps', wire: '16 AWG', fuse: '—' },
      { label: 'Switch → right lamps', wire: '16 AWG', fuse: '—' },
    ],
  },
  {
    id: 'horn',
    name: 'Horn',
    category: 'signals',
    wireGauge: '12 AWG',
    fuse: '20A',
    icon: 'horn',
    diagram: [
      { label: 'Battery (+)' },
      { label: '20A fuse' },
      { label: 'Horn relay' },
      { label: 'Horn' },
      { label: 'Ground' },
    ],
    notes: ['Horn button only triggers the relay — never route full horn current through the button.'],
  },
  {
    id: 'radiator-fan',
    name: 'Electric Radiator Fan',
    category: 'cooling',
    wireGauge: '14–10 AWG (by fan current)',
    fuse: '15–40A (by fan current)',
    icon: 'fan',
    diagram: [
      { label: 'Battery (+)' },
      { label: 'Fuse', sub: 'per fan size' },
      { label: 'Relay' },
      { label: 'Fan (+)' },
      { label: 'Fan (–)', sub: 'to chassis ground' },
    ],
    notes: ['Actual fan manufacturer fuse specification takes priority.'],
    table: [
      { label: 'Fan ≤10A', wire: '14 AWG', fuse: '15A' },
      { label: 'Fan 10–20A', wire: '12 AWG', fuse: '25A' },
      { label: 'Fan 20–30A', wire: '10 AWG', fuse: '30–40A' },
    ],
  },
  {
    id: '12v-socket',
    name: '12V Socket / Cigarette Lighter',
    category: 'interior',
    wireGauge: '14 AWG (16 AWG for USB-only charger)',
    fuse: '15A (10A for USB-only)',
    icon: 'socket',
    diagram: [
      { label: 'Battery (+) / switched +' },
      { label: '15A fuse' },
      { label: '12V socket' },
    ],
  },
  {
    id: 'interior-lights',
    name: 'Interior Lights',
    category: 'interior',
    wireGauge: '18 AWG (16 AWG for multiple LEDs)',
    fuse: '5A',
    icon: 'dome-light',
    diagram: [
      { label: 'Switched +' },
      { label: '5A fuse' },
      { label: 'Interior light(s)' },
    ],
  },
  {
    id: 'wipers',
    name: 'Wipers',
    category: 'interior',
    wireGauge: '14 AWG',
    fuse: '15–20A',
    icon: 'wiper',
    diagram: [
      { label: 'Battery (+) / switched +' },
      { label: '15–20A fuse' },
      { label: 'Wiper switch' },
      { label: 'Wiper motor' },
    ],
    notes: ['Follow the wiper motor manufacturer specification if available.'],
  },
  {
    id: 'radio',
    name: 'Radio / Stereo',
    category: 'audio',
    wireGauge: '16 AWG (basic stereo)',
    fuse: '10A',
    icon: 'radio',
    diagram: [
      { label: 'Switched +' },
      { label: '10A fuse' },
      { label: 'Radio / stereo' },
    ],
  },
  {
    id: 'amplifier',
    name: 'Amplifier',
    category: 'audio',
    wireGauge: '8–4 AWG (dedicated power cable)',
    fuse: 'Per amplifier spec',
    icon: 'amplifier',
    diagram: [
      { label: 'Battery (+)' },
      { label: 'Dedicated fuse', sub: 'per amp spec' },
      { label: 'Amplifier' },
    ],
    notes: ['Give the amplifier its own properly sized power cable and fuse — do not share the head-unit circuit.'],
  },
  {
    id: 'gauges',
    name: 'Dashboard Gauges',
    category: 'gauges',
    wireGauge: '18 AWG',
    fuse: '5–10A',
    icon: 'gauge',
    diagram: [
      { label: 'Switched +' },
      { label: '10A GAUGE fuse' },
      { label: 'Oil / temp / fuel gauges, voltmeter, indicator lamps' },
    ],
    notes: ['A dedicated 10A GAUGE circuit can serve oil pressure, temperature, fuel, voltmeter, and indicator lamps together.'],
  },
];

export const FUSE_PANEL: { slot: number; amps: string; label: string }[] = [
  { slot: 1, amps: '10A', label: 'IGNITION / GAUGES' },
  { slot: 2, amps: '15A', label: 'FUEL PUMP' },
  { slot: 3, amps: '20A', label: 'HEADLIGHT LOW' },
  { slot: 4, amps: '20A', label: 'HEADLIGHT HIGH' },
  { slot: 5, amps: '10A', label: 'PARK / TAIL' },
  { slot: 6, amps: '10A', label: 'BRAKE LIGHT' },
  { slot: 7, amps: '10A', label: 'TURN SIGNAL' },
  { slot: 8, amps: '20A', label: 'HORN' },
  { slot: 9, amps: '20A', label: 'WIPER' },
  { slot: 10, amps: '30A', label: 'RADIATOR FAN' },
  { slot: 11, amps: '15A', label: '12V SOCKET' },
  { slot: 12, amps: '10A', label: 'RADIO' },
  { slot: 13, amps: '5A', label: 'INTERIOR LIGHT' },
  { slot: 14, amps: '10A', label: 'LED ACCESSORY' },
  { slot: 15, amps: '15A', label: 'HAZARD' },
  { slot: 16, amps: '10A', label: 'ACCESSORY' },
];

export const WIRE_COLORS: { color: string; purpose: string; hex: string }[] = [
  { color: 'Red', purpose: 'Battery + constant', hex: '#d32f2f' },
  { color: 'Yellow', purpose: 'Ignition-switched +', hex: '#fbc02d' },
  { color: 'Black', purpose: 'Ground', hex: '#212121' },
  { color: 'Blue', purpose: 'Headlights', hex: '#1976d2' },
  { color: 'Green', purpose: 'Turn signals', hex: '#388e3c' },
  { color: 'Brown', purpose: 'Tail/park lights', hex: '#795548' },
  { color: 'White', purpose: 'Brake lights', hex: '#eeeeee' },
  { color: 'Orange', purpose: 'Accessories', hex: '#f57c00' },
  { color: 'Purple', purpose: 'Fuel pump', hex: '#7b1fa2' },
  { color: 'Gray', purpose: 'Gauges', hex: '#757575' },
];

export const NEXT_STEPS: string[] = [
  'Engine: 4K or another engine.',
  'Carburetor or EFI.',
  'Alternator type and amperage (AC alternator, internal vs. external regulator).',
  'Electric or mechanical fuel pump.',
  'Number/type of headlights.',
  'Radiator fan and its current rating.',
  'Wiper motor.',
  'Horn count/type.',
  'Radio/amplifier.',
  'Additional LED/auxiliary lights.',
  '12V sockets/USB chargers.',
  'Any winch or other high-current accessory.',
  'Approximate cable lengths for major circuits.',
  'Whether replacing the entire harness or only adding/reworking accessories.',
];
