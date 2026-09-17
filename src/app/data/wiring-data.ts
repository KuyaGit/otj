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
    notes: ['Hazard circuit can use 15A if the total lamp load requires it.'],
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
  { slot: 14, amps: '10A', label: 'ACCESSORY' },
  { slot: 15, amps: '10A', label: 'ACCESSORY' },
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
  'Alternator amperage.',
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
