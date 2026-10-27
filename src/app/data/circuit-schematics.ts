// Schematic of each circuit as vertical branches, left to right. A branch is a chain of two-pin parts
// from a top net to a bottom net ('GND' draws a ground symbol, any other name is a net label), and
// branches that share a net name are joined. The same description feeds the on-page KiCad-style drawing,
// the downloadable .kicad_sch and the Universal Netlist export, so they cannot disagree.
//
// Illustrative: it shows how each circuit is arranged, not where a real harness splices.
export type PartKind =
  | 'battery'
  | 'alternator'
  | 'fuse'
  | 'switch'
  | 'relayCoil'
  | 'relayContact'
  | 'lamp'
  | 'motor'
  | 'load'
  | 'cable';

export interface SchPart {
  kind: PartKind;
  ref: string;     // unique within the circuit; a relay coil and its contact share a number (K1, K1-1)
  value: string;   // short, it is printed beside the part
}

export interface SchBranch {
  top: string;
  parts: SchPart[];
  bottom: string;
  wired?: true;    // print the circuit's wire gauge and colour on this branch
}

const p = (kind: PartKind, ref: string, value: string): SchPart => ({ kind, ref, value });

const BATTERY: SchBranch = { top: '+12V BATT', parts: [p('battery', 'BT1', '12V battery')], bottom: 'GND' };
const IGNITION: SchBranch = { top: '+12V BATT', parts: [p('switch', 'SW1', 'Ignition switch')], bottom: '+12V IGN' };

// Relay circuits: a control branch that energises the coil, then a fused power branch through the contact
const relay = (
  control: { top: string; parts: SchPart[] },
  power: { fuse: string; load: SchPart[]; to?: string },
): SchBranch[] => [
  { top: control.top, parts: [...control.parts, p('relayCoil', 'K1', 'Relay coil')], bottom: 'GND' },
  {
    top: '+12V BATT',
    parts: [p('fuse', 'F1', power.fuse), p('relayContact', 'K1-1', 'Relay contact'), ...power.load],
    bottom: power.to ?? 'GND',
    wired: true,
  },
];

const lampsOn = (net: string, names: string[]): SchBranch[] =>
  names.map((name, i) => ({ top: net, parts: [p('lamp', `LP${i + 1}`, name)], bottom: 'GND' }));

export const CIRCUIT_SCHEMATICS: Record<string, SchBranch[]> = {
  'main-feed': [
    BATTERY,
    {
      top: '+12V BATT',
      parts: [p('fuse', 'F1', 'Main fuse 60-100A'), p('load', 'LD1', 'Fuse/relay panel')],
      bottom: 'GND',
      wired: true,
    },
  ],

  'charging-system': [
    { top: 'ALT B+', parts: [p('alternator', 'G1', 'AC alternator')], bottom: 'GND' },
    { top: 'ALT B+', parts: [p('fuse', 'F1', 'Fusible link 40-80A')], bottom: '+12V BATT', wired: true },
    BATTERY,
  ],

  'big-3-upgrade': [
    { top: '+12V BATT', parts: [p('battery', 'BT1', '12V battery')], bottom: 'BATT-' },
    { top: 'BATT-', parts: [p('cable', 'W1', 'Battery to chassis')], bottom: 'GND', wired: true },
    { top: 'ENGINE', parts: [p('cable', 'W2', 'Engine to chassis')], bottom: 'GND', wired: true },
    { top: 'ALT B+', parts: [p('alternator', 'G1', 'AC alternator')], bottom: 'ALT CASE' },
    { top: 'ALT CASE', parts: [p('cable', 'W3', 'Case strap (opt.)')], bottom: 'ENGINE', wired: true },
    {
      top: 'ALT B+',
      parts: [p('cable', 'W4', 'Charge cable'), p('fuse', 'F1', 'Fuse, alt. rating')],
      bottom: '+12V BATT',
      wired: true,
    },
  ],

  starter: [
    BATTERY,
    { top: '+12V BATT', parts: [p('switch', 'SW1', 'Ignition START')], bottom: 'START' },
    { top: 'START', parts: [p('relayCoil', 'K1', 'Starter relay')], bottom: 'GND' },
    {
      top: '+12V BATT',
      parts: [p('cable', 'W1', 'Heavy cable'), p('relayContact', 'K1-1', 'Relay contact'), p('motor', 'M1', 'Starter motor')],
      bottom: 'GND',
      wired: true,
    },
  ],

  'ignition-carbureted': [
    BATTERY,
    IGNITION,
    ...relay(
      { top: '+12V IGN', parts: [] },
      { fuse: '15A', load: [p('load', 'LD1', 'Coil / module')] },
    ),
  ],

  'fuel-pump': [
    BATTERY,
    IGNITION,
    ...relay(
      { top: '+12V IGN', parts: [] },
      { fuse: '7.5-20A', load: [p('motor', 'M1', 'Fuel pump')] },
    ),
  ],

  'headlight-low': [
    BATTERY,
    ...relay(
      { top: '+12V BATT', parts: [p('switch', 'SW1', 'Headlight switch')] },
      { fuse: '20A', load: [], to: 'LOW BEAM' },
    ),
    ...lampsOn('LOW BEAM', ['Left low beam', 'Right low beam']),
  ],

  'headlight-high': [
    BATTERY,
    ...relay(
      { top: '+12V BATT', parts: [p('switch', 'SW1', 'Headlight switch')] },
      { fuse: '20A', load: [], to: 'HIGH BEAM' },
    ),
    ...lampsOn('HIGH BEAM', ['Left high beam', 'Right high beam']),
  ],

  'led-accessory-power': [
    BATTERY,
    ...relay(
      { top: '+12V BATT', parts: [p('switch', 'SW1', 'Dash switch')] },
      { fuse: '10-15A', load: [p('load', 'LD1', 'DC-DC stabilizer'), p('lamp', 'LP1', 'LED lights')] },
    ),
  ],

  'tail-park': [
    BATTERY,
    { top: '+12V BATT', parts: [p('switch', 'SW1', 'Light switch'), p('fuse', 'F1', '10A')], bottom: 'PARK', wired: true },
    ...lampsOn('PARK', ['Tail lamp L', 'Tail lamp R', 'Plate light']),
  ],

  'brake-lights': [
    BATTERY,
    { top: '+12V BATT', parts: [p('fuse', 'F1', '10A'), p('switch', 'SW1', 'Brake switch')], bottom: 'BRAKE', wired: true },
    ...lampsOn('BRAKE', ['Brake lamp L', 'Brake lamp R']),
  ],

  'turn-signals': [
    BATTERY,
    IGNITION,
    {
      top: '+12V IGN',
      parts: [p('fuse', 'F1', '10A'), p('load', 'LD1', 'Flasher'), p('switch', 'SW2', 'Turn switch')],
      bottom: 'TURN',
      wired: true,
    },
    ...lampsOn('TURN', ['Front lamp L', 'Front lamp R', 'Rear lamp L', 'Rear lamp R']),
  ],

  'hazard-lights': [
    BATTERY,
    { top: '+12V BATT', parts: [p('fuse', 'F1', '15A'), p('load', 'LD1', 'Hazard flasher')], bottom: 'HAZARD', wired: true },
    { top: 'HAZARD', parts: [p('switch', 'SW1A', 'Hazard sw. left')], bottom: 'TURN L', wired: true },
    { top: 'HAZARD', parts: [p('switch', 'SW1B', 'Hazard sw. right')], bottom: 'TURN R', wired: true },
    { top: 'TURN L', parts: [p('lamp', 'LP1', 'Left lamps F/R')], bottom: 'GND' },
    { top: 'TURN R', parts: [p('lamp', 'LP2', 'Right lamps F/R')], bottom: 'GND' },
  ],

  horn: [
    BATTERY,
    ...relay(
      { top: '+12V BATT', parts: [p('switch', 'SW1', 'Horn button')] },
      { fuse: '20A', load: [p('load', 'LD1', 'Horn')] },
    ),
  ],

  'radiator-fan': [
    BATTERY,
    ...relay(
      { top: '+12V BATT', parts: [p('switch', 'SW1', 'Fan switch')] },
      { fuse: '15-40A', load: [p('motor', 'M1', 'Radiator fan')] },
    ),
  ],

  '12v-socket': [
    BATTERY,
    { top: '+12V BATT', parts: [p('fuse', 'F1', '15A'), p('load', 'LD1', '12V socket')], bottom: 'GND', wired: true },
  ],

  'interior-lights': [
    BATTERY,
    IGNITION,
    { top: '+12V IGN', parts: [p('fuse', 'F1', '5A'), p('lamp', 'LP1', 'Interior lights')], bottom: 'GND', wired: true },
  ],

  wipers: [
    BATTERY,
    IGNITION,
    {
      top: '+12V IGN',
      parts: [p('fuse', 'F1', '15-20A'), p('switch', 'SW2', 'Wiper switch'), p('motor', 'M1', 'Wiper motor')],
      bottom: 'GND',
      wired: true,
    },
  ],

  radio: [
    BATTERY,
    IGNITION,
    { top: '+12V IGN', parts: [p('fuse', 'F1', '10A'), p('load', 'LD1', 'Radio / stereo')], bottom: 'GND', wired: true },
  ],

  amplifier: [
    BATTERY,
    { top: '+12V BATT', parts: [p('fuse', 'F1', 'Per amp spec'), p('load', 'LD1', 'Amplifier')], bottom: 'GND', wired: true },
  ],

  gauges: [
    BATTERY,
    IGNITION,
    { top: '+12V IGN', parts: [p('fuse', 'F1', '10A GAUGE'), p('load', 'LD1', 'Gauges, lamps')], bottom: 'GND', wired: true },
  ],
};
