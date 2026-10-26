import { CIRCUITS, WIRE_COLORS } from './wiring-data';

// Positions are [x, y, z] in metres. x: left (–) to right (+), y: up, z: rear (–) to front (+).
// The Jeep is about 3.6 m long and 1.5 m wide, left-hand drive. They show a typical owner-type jeep
// layout, not measurements: confirm against the real vehicle before cutting wire.
export type Vec3 = [number, number, number];

export type NodeKind = 'source' | 'hub' | 'switch' | 'load' | 'ground';

export interface MapNode {
  label: string;
  pos: Vec3;
  kind: NodeKind;
}

// feed: constant battery power · switched: only live with the key or a switch · ground: return path
export type LegKind = 'feed' | 'switched' | 'ground';

export interface Leg {
  from: string;
  to: string;
  via?: string[];
  kind: LegKind;
}

export const MAP_NODES: Record<string, MapNode> = {
  battery: { label: 'Battery', pos: [-0.45, 0.8, 1.3], kind: 'source' },
  alternator: { label: 'Alternator', pos: [0.25, 0.65, 1.35], kind: 'source' },
  starter: { label: 'Starter', pos: [-0.3, 0.5, 0.95], kind: 'load' },
  coil: { label: 'Coil / distributor / choke', pos: [0.15, 0.95, 1.15], kind: 'load' },
  fuseBox: { label: 'Fuse / relay panel', pos: [-0.4, 0.95, 0.45], kind: 'hub' },
  ignSwitch: { label: 'Ignition switch', pos: [-0.3, 1.0, 0.25], kind: 'switch' },
  colSwitch: { label: 'Column switches (lights, turn)', pos: [-0.3, 1.08, 0.22], kind: 'switch' },
  brakeSwitch: { label: 'Brake pedal switch', pos: [-0.38, 0.65, 0.2], kind: 'switch' },

  headL: { label: 'Headlight L', pos: [-0.55, 0.95, 1.8], kind: 'load' },
  headR: { label: 'Headlight R', pos: [0.55, 0.95, 1.8], kind: 'load' },
  turnFL: { label: 'Front turn lamp L', pos: [-0.7, 0.9, 1.78], kind: 'load' },
  turnFR: { label: 'Front turn lamp R', pos: [0.7, 0.9, 1.78], kind: 'load' },
  horn: { label: 'Horn', pos: [0.35, 0.8, 1.6], kind: 'load' },
  fan: { label: 'Radiator fan', pos: [0.0, 0.85, 1.55], kind: 'load' },
  wiperMotor: { label: 'Wiper motor', pos: [0.05, 1.18, 0.62], kind: 'load' },
  ledBar: { label: 'LED light bar', pos: [0.0, 1.68, 0.45], kind: 'load' },
  gauges: { label: 'Gauge cluster', pos: [-0.3, 1.1, 0.3], kind: 'load' },
  radio: { label: 'Radio', pos: [0.0, 1.05, 0.3], kind: 'load' },
  socket: { label: '12V socket', pos: [0.2, 0.98, 0.3], kind: 'load' },
  dome: { label: 'Dome light', pos: [0.0, 1.7, -0.3], kind: 'load' },
  tailL: { label: 'Tail / brake lamp L', pos: [-0.62, 0.8, -1.8], kind: 'load' },
  tailR: { label: 'Tail / brake lamp R', pos: [0.62, 0.8, -1.8], kind: 'load' },
  fuelPump: { label: 'Fuel pump', pos: [0.0, 0.45, -1.35], kind: 'load' },
  amp: { label: 'Amplifier', pos: [0.3, 0.65, -0.95], kind: 'load' },

  groundChassis: { label: 'Chassis ground (front)', pos: [-0.6, 0.55, 1.25], kind: 'ground' },
  groundEngine: { label: 'Engine block ground', pos: [0.0, 0.6, 1.1], kind: 'ground' },
  groundBody: { label: 'Body ground (dash)', pos: [-0.6, 0.55, 0.35], kind: 'ground' },
  groundRear: { label: 'Chassis ground (rear)', pos: [-0.55, 0.5, -1.4], kind: 'ground' },
};

// Shared bends. Routes that use the same waypoints bundle into trunks like a real harness.
export const MAP_WAYPOINTS: Record<string, Vec3> = {
  firewallL: [-0.45, 0.95, 0.5],        // grommet through the firewall, driver side
  engineTop: [-0.1, 1.0, 1.2],          // across the top of the engine bay
  frontCross: [0.0, 0.95, 1.65],        // behind the grille
  dashLeft: [-0.35, 1.0, 0.35],
  dashCenter: [0.0, 1.0, 0.35],
  aPillarBase: [-0.7, 1.05, 0.5],
  aPillarTop: [-0.7, 1.65, 0.55],
  roofFront: [0.0, 1.68, 0.4],
  railFront: [-0.62, 0.45, 0.45],       // driver-side frame rail, under the floor
  railMid: [-0.62, 0.45, -0.5],
  railRearMid: [-0.62, 0.45, -1.35],
  railRear: [-0.62, 0.45, -1.7],
  crossRear: [0.0, 0.45, -1.7],         // rear crossmember
  crossRearR: [0.62, 0.45, -1.7],
};

const FUSE_TO_COL: Leg = { from: 'fuseBox', to: 'colSwitch', via: ['dashLeft'], kind: 'feed' };
const REAR_TRUNK = ['firewallL', 'railFront', 'railMid', 'railRear'];
const REAR_TRUNK_R = [...REAR_TRUNK, 'crossRear', 'crossRearR'];

// One entry per circuit id in CIRCUITS. A circuit with no entry shows "no 3D route yet" on the map.
export const MAP_ROUTES: Record<string, Leg[]> = {
  'main-feed': [
    { from: 'battery', to: 'fuseBox', via: ['firewallL'], kind: 'feed' },
    { from: 'battery', to: 'groundChassis', kind: 'ground' },
    { from: 'groundChassis', to: 'groundEngine', kind: 'ground' },
    { from: 'groundChassis', to: 'groundBody', via: ['firewallL'], kind: 'ground' },
  ],
  'charging-system': [
    { from: 'alternator', to: 'battery', via: ['engineTop'], kind: 'feed' },
    { from: 'alternator', to: 'groundEngine', kind: 'ground' },
    { from: 'groundEngine', to: 'groundChassis', kind: 'ground' },
    { from: 'battery', to: 'groundChassis', kind: 'ground' },
  ],
  starter: [
    { from: 'battery', to: 'starter', kind: 'feed' },
    { from: 'ignSwitch', to: 'fuseBox', via: ['dashLeft'], kind: 'switched' },
    { from: 'fuseBox', to: 'starter', via: ['firewallL'], kind: 'switched' },
  ],
  'ignition-carbureted': [
    { from: 'ignSwitch', to: 'fuseBox', via: ['dashLeft'], kind: 'switched' },
    { from: 'fuseBox', to: 'coil', via: ['firewallL', 'engineTop'], kind: 'switched' },
    { from: 'coil', to: 'groundEngine', kind: 'ground' },
  ],
  'fuel-pump': [
    { from: 'fuseBox', to: 'fuelPump', via: ['firewallL', 'railFront', 'railMid', 'railRearMid'], kind: 'switched' },
    { from: 'fuelPump', to: 'groundRear', kind: 'ground' },
  ],
  'headlight-low': [
    { from: 'colSwitch', to: 'fuseBox', via: ['dashLeft'], kind: 'switched' },
    { from: 'fuseBox', to: 'headL', via: ['firewallL', 'engineTop'], kind: 'feed' },
    { from: 'fuseBox', to: 'headR', via: ['firewallL', 'engineTop', 'frontCross'], kind: 'feed' },
    { from: 'headL', to: 'groundChassis', kind: 'ground' },
    { from: 'headR', to: 'groundChassis', via: ['frontCross'], kind: 'ground' },
  ],
  'headlight-high': [
    { from: 'colSwitch', to: 'fuseBox', via: ['dashLeft'], kind: 'switched' },
    { from: 'fuseBox', to: 'headL', via: ['firewallL', 'engineTop'], kind: 'feed' },
    { from: 'fuseBox', to: 'headR', via: ['firewallL', 'engineTop', 'frontCross'], kind: 'feed' },
    { from: 'headL', to: 'groundChassis', kind: 'ground' },
    { from: 'headR', to: 'groundChassis', via: ['frontCross'], kind: 'ground' },
  ],
  'led-accessory-power': [
    { from: 'battery', to: 'ledBar', via: ['firewallL', 'aPillarBase', 'aPillarTop', 'roofFront'], kind: 'feed' },
    { from: 'colSwitch', to: 'fuseBox', via: ['dashLeft'], kind: 'switched' },
    { from: 'ledBar', to: 'groundBody', via: ['roofFront', 'aPillarTop', 'aPillarBase'], kind: 'ground' },
  ],
  'tail-park': [
    FUSE_TO_COL,
    { from: 'fuseBox', to: 'tailL', via: REAR_TRUNK, kind: 'switched' },
    { from: 'fuseBox', to: 'tailR', via: REAR_TRUNK_R, kind: 'switched' },
    { from: 'tailL', to: 'groundRear', kind: 'ground' },
    { from: 'tailR', to: 'groundRear', via: ['crossRearR', 'crossRear', 'railRear'], kind: 'ground' },
  ],
  'brake-lights': [
    { from: 'fuseBox', to: 'brakeSwitch', via: ['dashLeft'], kind: 'feed' },
    { from: 'brakeSwitch', to: 'tailL', via: ['railFront', 'railMid', 'railRear'], kind: 'switched' },
    { from: 'brakeSwitch', to: 'tailR', via: ['railFront', 'railMid', 'railRear', 'crossRear', 'crossRearR'], kind: 'switched' },
    { from: 'tailL', to: 'groundRear', kind: 'ground' },
  ],
  'turn-signals': [
    FUSE_TO_COL,
    { from: 'colSwitch', to: 'turnFL', via: ['dashLeft', 'firewallL', 'engineTop'], kind: 'switched' },
    { from: 'colSwitch', to: 'turnFR', via: ['dashLeft', 'firewallL', 'engineTop', 'frontCross'], kind: 'switched' },
    { from: 'colSwitch', to: 'tailL', via: ['dashLeft', ...REAR_TRUNK], kind: 'switched' },
    { from: 'colSwitch', to: 'tailR', via: ['dashLeft', ...REAR_TRUNK_R], kind: 'switched' },
  ],
  horn: [
    { from: 'fuseBox', to: 'horn', via: ['firewallL', 'engineTop'], kind: 'feed' },
    { from: 'horn', to: 'groundChassis', kind: 'ground' },
  ],
  'radiator-fan': [
    { from: 'fuseBox', to: 'fan', via: ['firewallL', 'engineTop'], kind: 'feed' },
    { from: 'fan', to: 'groundChassis', kind: 'ground' },
  ],
  '12v-socket': [
    { from: 'fuseBox', to: 'socket', via: ['dashLeft', 'dashCenter'], kind: 'feed' },
    { from: 'socket', to: 'groundBody', via: ['dashCenter', 'dashLeft'], kind: 'ground' },
  ],
  'interior-lights': [
    { from: 'fuseBox', to: 'dome', via: ['dashLeft', 'aPillarBase', 'aPillarTop', 'roofFront'], kind: 'switched' },
    { from: 'dome', to: 'groundBody', via: ['roofFront', 'aPillarTop', 'aPillarBase'], kind: 'ground' },
  ],
  wipers: [
    { from: 'fuseBox', to: 'wiperMotor', via: ['dashLeft', 'dashCenter'], kind: 'switched' },
    { from: 'wiperMotor', to: 'groundBody', via: ['dashCenter', 'dashLeft'], kind: 'ground' },
  ],
  radio: [
    { from: 'fuseBox', to: 'radio', via: ['dashLeft'], kind: 'switched' },
    { from: 'radio', to: 'groundBody', via: ['dashLeft'], kind: 'ground' },
  ],
  amplifier: [
    { from: 'battery', to: 'amp', via: ['firewallL', 'railFront', 'railMid'], kind: 'feed' },
    { from: 'amp', to: 'groundRear', via: ['railMid', 'railRearMid'], kind: 'ground' },
  ],
  gauges: [
    { from: 'fuseBox', to: 'gauges', via: ['dashLeft'], kind: 'switched' },
    { from: 'gauges', to: 'groundBody', kind: 'ground' },
  ],
};

// Wire colour per circuit, taken from the guide's own colour legend (WIRE_COLORS)
const CIRCUIT_COLOR_NAME: Record<string, string> = {
  'main-feed': 'Red',
  'charging-system': 'Red',
  starter: 'Red',
  'ignition-carbureted': 'Yellow',
  'fuel-pump': 'Purple',
  'headlight-low': 'Blue',
  'headlight-high': 'Blue',
  'led-accessory-power': 'Orange',
  'tail-park': 'Brown',
  'brake-lights': 'White',
  'turn-signals': 'Green',
  amplifier: 'Red',
  gauges: 'Gray',
};

// Black would vanish on the dark scene, so return wires are drawn light grey
export const GROUND_WIRE_COLOR = '#b0b6c0';

export function wireColorFor(circuitId: string): string {
  const name = CIRCUIT_COLOR_NAME[circuitId] ?? 'Orange';
  return WIRE_COLORS.find((c) => c.color === name)?.hex ?? '#f57c00';
}

// Tube radius in scene metres from a gauge string such as "14–10 AWG (by fan current)". Takes the
// thickest gauge in a range. Real wire diameter is exaggerated 10x so it reads at scene scale.
export function wireRadius(wireGauge: string): number {
  const m = wireGauge.match(/(\d+)(?:\s*[–-]\s*(\d+))?\s*AWG/i);
  const awg = m ? Math.min(Number(m[1]), m[2] ? Number(m[2]) : Infinity) : 16;
  const diameterMm = 0.127 * Math.pow(92, (36 - awg) / 39);
  return (diameterMm / 2 / 1000) * 10;
}

export function legPoints(leg: Leg): Vec3[] {
  const via = (leg.via ?? []).map((id) => MAP_WAYPOINTS[id]);
  return [MAP_NODES[leg.from].pos, ...via, MAP_NODES[leg.to].pos];
}

export const MAPPED_CIRCUIT_IDS: string[] = CIRCUITS.map((c) => c.id).filter((id) => MAP_ROUTES[id]?.length);
