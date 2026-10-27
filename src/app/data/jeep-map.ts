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
  desc: string;   // what the part is and the wire/fuse facts from the circuit pages
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
  battery: { label: 'Battery', pos: [-0.45, 0.8, 1.3], kind: 'source', desc: 'Main power source. Fit the main fuse (60–100A) as close to the positive terminal as practical.' },
  alternator: { label: 'Alternator', pos: [0.25, 0.65, 1.35], kind: 'source', desc: 'Charges the battery while the engine runs. The charge cable to the battery is 6–8 AWG with a 40–80A fuse or fusible link.' },
  starter: { label: 'Starter', pos: [-0.3, 0.5, 0.95], kind: 'load', desc: 'Takes heavy battery current through a 2–4 AWG cable. The ignition switch only triggers the starter relay, never the motor current.' },
  coil: { label: 'Coil / distributor / choke', pos: [0.15, 0.95, 1.15], kind: 'load', desc: 'Ignition coil, module, distributor and electric choke, fed from the ignition relay (14–16 AWG, 10–15A per sub-circuit).' },
  fuseBox: { label: 'Fuse / relay panel', pos: [-0.4, 0.95, 0.45], kind: 'hub', desc: 'Central fuse and relay panel under the dash. High-current loads switch through relays here instead of through dash switches.' },
  ignSwitch: { label: 'Ignition switch', pos: [-0.3, 1.0, 0.25], kind: 'switch', desc: 'Ignition switch. It only triggers relays and switched circuits and should never carry starter or heavy load current.' },
  colSwitch: { label: 'Column switches (lights, turn)', pos: [-0.3, 1.08, 0.22], kind: 'switch', desc: 'Steering column light and turn-signal switches. The headlight switch only triggers the relays, it does not carry lamp current.' },
  brakeSwitch: { label: 'Brake pedal switch', pos: [-0.38, 0.65, 0.2], kind: 'switch', desc: 'Brake pedal switch. It feeds the brake lamps on 16 AWG with a 10A fuse.' },
  hazardSwitch: { label: 'Hazard switch', pos: [-0.15, 1.12, 0.32], kind: 'switch', desc: 'Dash hazard switch (multi-pole). Fed constant power from a 15A fuse through a heavy-duty flasher; when pressed it cuts the turn flasher and flashes both sides on 16 AWG.' },

  headL: { label: 'Headlight L', pos: [-0.55, 0.95, 1.8], kind: 'load', desc: 'Left headlamp. Low and high beam are fed through separate 12 AWG, 20A relay circuits.' },
  headR: { label: 'Headlight R', pos: [0.55, 0.95, 1.8], kind: 'load', desc: 'Right headlamp. Low and high beam are fed through separate 12 AWG, 20A relay circuits.' },
  turnFL: { label: 'Front turn lamp L', pos: [-0.7, 0.9, 1.78], kind: 'load', desc: 'Left front turn lamp, fed through the flasher and turn switch on 16 AWG, 10A. The hazard switch also feeds it on the 15A hazard circuit.' },
  turnFR: { label: 'Front turn lamp R', pos: [0.7, 0.9, 1.78], kind: 'load', desc: 'Right front turn lamp, fed through the flasher and turn switch on 16 AWG, 10A. The hazard switch also feeds it on the 15A hazard circuit.' },
  horn: { label: 'Horn', pos: [0.35, 0.8, 1.6], kind: 'load', desc: 'Horn, switched by a relay on 12 AWG with a 20A fuse. The horn button only triggers the relay.' },
  fan: { label: 'Radiator fan', pos: [0.0, 0.85, 1.55], kind: 'load', desc: 'Electric radiator fan. Size the wire and fuse to the fan current (14–10 AWG, 15–40A) and drive it through a relay.' },
  wiperMotor: { label: 'Wiper motor', pos: [0.05, 1.18, 0.62], kind: 'load', desc: 'Wiper motor on 14 AWG with a 15–20A fuse. Follow the motor manufacturer specification if you have it.' },
  ledBar: { label: 'LED light bar', pos: [0.0, 1.68, 0.45], kind: 'load', desc: 'Auxiliary LED lights. Feed them through a fuse and relay. LEDs rated 9–32V with a built-in driver need no stabilizer.' },
  gauges: { label: 'Gauge cluster', pos: [-0.3, 1.1, 0.3], kind: 'load', desc: 'Dash gauges and indicator lamps on a 10A GAUGE fuse with 18 AWG wire.' },
  radio: { label: 'Radio', pos: [0.0, 1.05, 0.3], kind: 'load', desc: 'Head unit on a switched feed, 16 AWG with a 10A fuse.' },
  socket: { label: '12V socket', pos: [0.2, 0.98, 0.3], kind: 'load', desc: '12V socket on 14 AWG with a 15A fuse (16 AWG and 10A for a USB-only charger).' },
  dome: { label: 'Dome light', pos: [0.0, 1.7, -0.3], kind: 'load', desc: 'Interior light on a switched feed, 18 AWG (16 AWG for several LEDs) with a 5A fuse.' },
  tailL: { label: 'Tail / brake lamp L', pos: [-0.62, 0.8, -1.8], kind: 'load', desc: 'Left rear lamp assembly: tail, brake and rear turn signal, fed on 16 AWG with 10A fuses.' },
  tailR: { label: 'Tail / brake lamp R', pos: [0.62, 0.8, -1.8], kind: 'load', desc: 'Right rear lamp assembly: tail, brake and rear turn signal, fed on 16 AWG with 10A fuses.' },
  fuelPump: { label: 'Fuel pump', pos: [0.0, 0.45, -1.35], kind: 'load', desc: 'Electric fuel pump at the tank. Size the wire and fuse to the pump current (16–12 AWG, 7.5–20A) and drive it through a relay.' },
  amp: { label: 'Amplifier', pos: [0.3, 0.65, -0.95], kind: 'load', desc: 'Amplifier with its own heavy power cable (8–4 AWG) and fuse, separate from the head-unit circuit.' },

  groundChassis: { label: 'Chassis ground (front)', pos: [-0.6, 0.55, 1.25], kind: 'ground', desc: 'Front chassis ground. Battery negative goes to the chassis on 4 AWG, and the front-end loads return here.' },
  groundEngine: { label: 'Engine block ground', pos: [0.0, 0.6, 1.1], kind: 'ground', desc: 'Engine block ground. The engine to chassis strap is 4–6 AWG.' },
  groundBody: { label: 'Body ground (dash)', pos: [-0.6, 0.55, 0.35], kind: 'ground', desc: 'Body ground for dash and cabin loads. The body to chassis strap is 8–10 AWG.' },
  groundRear: { label: 'Chassis ground (rear)', pos: [-0.55, 0.5, -1.4], kind: 'ground', desc: 'Rear chassis ground for the tail lamps, fuel pump and amplifier.' },
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

// Plain-English names for the waypoints, used to describe how each wire runs
export const WAYPOINT_LABELS: Record<string, string> = {
  firewallL: 'firewall grommet (driver side)',
  engineTop: 'across the top of the engine bay',
  frontCross: 'behind the grille',
  dashLeft: 'behind the dash, driver side',
  dashCenter: 'behind the dash, centre',
  aPillarBase: 'base of the driver-side A-pillar',
  aPillarTop: 'top of the driver-side A-pillar',
  roofFront: 'front roof rail',
  railFront: 'driver-side frame rail, front',
  railMid: 'driver-side frame rail, middle',
  railRearMid: 'driver-side frame rail, near the tank',
  railRear: 'driver-side frame rail, rear',
  crossRear: 'rear crossmember',
  crossRearR: 'rear crossmember, passenger side',
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
  'big-3-upgrade': [
    { from: 'alternator', to: 'battery', via: ['engineTop'], kind: 'feed' },
    { from: 'battery', to: 'groundChassis', kind: 'ground' },
    { from: 'groundEngine', to: 'groundChassis', kind: 'ground' },
    { from: 'alternator', to: 'groundEngine', kind: 'ground' },
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
  'hazard-lights': [
    { from: 'fuseBox', to: 'hazardSwitch', via: ['dashLeft'], kind: 'feed' },
    { from: 'hazardSwitch', to: 'turnFL', via: ['dashLeft', 'firewallL', 'engineTop'], kind: 'switched' },
    { from: 'hazardSwitch', to: 'turnFR', via: ['dashLeft', 'firewallL', 'engineTop', 'frontCross'], kind: 'switched' },
    { from: 'hazardSwitch', to: 'tailL', via: ['dashLeft', ...REAR_TRUNK], kind: 'switched' },
    { from: 'hazardSwitch', to: 'tailR', via: ['dashLeft', ...REAR_TRUNK_R], kind: 'switched' },
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
  'big-3-upgrade': 'Red',
  starter: 'Red',
  'ignition-carbureted': 'Yellow',
  'fuel-pump': 'Purple',
  'headlight-low': 'Blue',
  'headlight-high': 'Blue',
  'led-accessory-power': 'Orange',
  'tail-park': 'Brown',
  'brake-lights': 'White',
  'turn-signals': 'Green',
  'hazard-lights': 'Green',
  amplifier: 'Red',
  gauges: 'Gray',
};

// Black would vanish on the dark scene, so return wires are drawn light grey
export const GROUND_WIRE_COLOR = '#b0b6c0';

export function wireColorNameFor(circuitId: string): string {
  return CIRCUIT_COLOR_NAME[circuitId] ?? 'Orange';
}

export function wireColorFor(circuitId: string): string {
  const name = wireColorNameFor(circuitId);
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

export const NODE_KIND_LABEL: Record<NodeKind, string> = {
  source: 'Power source',
  hub: 'Fuse / relay hub',
  switch: 'Switch',
  load: 'Load',
  ground: 'Ground point',
};

export const LEG_KIND_LABEL: Record<LegKind, string> = {
  feed: 'Constant power',
  switched: 'Switched power',
  ground: 'Ground return',
};

export interface NodeLink {
  direction: 'in' | 'out';   // in: the wire arrives at this part, out: it leaves toward `other`
  otherId: string;
  other: string;
  kind: LegKind;
  color: string;
  colorName: string;
  route: string;             // how the wire runs, starting from this part
}

export interface NodeConnection {
  circuitId: string;
  links: NodeLink[];
}

// Every wire that touches a part, grouped by circuit in the guide's order
export function connectionsFor(nodeId: string): NodeConnection[] {
  const result: NodeConnection[] = [];
  for (const circuit of CIRCUITS) {
    const links: NodeLink[] = [];
    for (const leg of MAP_ROUTES[circuit.id] ?? []) {
      if (leg.from !== nodeId && leg.to !== nodeId) continue;
      const outgoing = leg.from === nodeId;
      const otherId = outgoing ? leg.to : leg.from;
      const via = leg.via ?? [];
      const ground = leg.kind === 'ground';
      links.push({
        direction: outgoing ? 'out' : 'in',
        otherId,
        other: MAP_NODES[otherId].label,
        kind: leg.kind,
        color: ground ? GROUND_WIRE_COLOR : wireColorFor(circuit.id),
        colorName: ground ? 'Black' : wireColorNameFor(circuit.id),
        route: (outgoing ? via : [...via].reverse()).map((w) => WAYPOINT_LABELS[w]).join(' → '),
      });
    }
    if (links.length) result.push({ circuitId: circuit.id, links });
  }
  return result;
}
