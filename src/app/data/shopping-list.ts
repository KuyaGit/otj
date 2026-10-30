import { CIRCUITS } from './wiring-data';

export interface ShopItem {
  id: string;        // the saved-data key: never rename or reuse one
  name: string;
  qty: string;
  detail?: string;
  optional?: boolean;
  group?: string;    // a heading shown when it changes, used to group wire by size
  color?: string;    // a colour name from WIRE_COLORS, shown as a swatch
}

export interface ShopSection {
  id: string;
  title: string;
  why: string;
  items: ShopItem[];
}

export const SPARE_RELAYS = 2;

// The relay and flasher counts follow the circuits that have pin tables, so they stay right when a circuit is added
export const RELAY_COUNT = CIRCUITS.filter((c) => c.relay).length;
export const FLASHER_COUNT = CIRCUITS.filter((c) => c.flasher).length;

// The shop sells every colour in 5 m and 10 m lengths, in these six colours only
export const SHOP_WIRE_COLORS = ['Black', 'Red', 'Blue', 'Green', 'Yellow', 'White'];

// Round a length up to whole 5 m and 10 m packs, using the fewest packs
export function wirePacks(meters: number): { total: number; text: string } {
  const tens = Math.floor(meters / 10);
  const rest = meters - tens * 10;
  const tensBought = tens + (rest > 5 ? 1 : 0);
  const five = rest > 0 && rest <= 5;
  const parts = [tensBought ? `${tensBought} × 10 m` : '', five ? '1 × 5 m' : ''].filter(Boolean);
  return { total: tensBought * 10 + (five ? 5 : 0), text: parts.join(' + ') };
}

// One tickable row per size and colour. `need` is the length the runs use, qty is what to buy.
const wire = (gauge: number, color: string, need: number, detail: string, optional?: true): ShopItem => {
  const packs = wirePacks(need);
  return {
    id: `wire-${gauge}-${color.toLowerCase()}`,
    name: `${gauge} AWG wire, ${color.toLowerCase()}`,
    qty: `${packs.total} m`,
    detail: `Need about ${need} m, so buy ${packs.text}. ${detail}`,
    optional,
    group: `${gauge} AWG`,
    color,
  };
};

export const SHOPPING_NOTES: string[] = [
  'Quantities assume you wire every relay circuit in the guide plus the turn and hazard flashers. Skip anything you are not doing.',
  'Wire lengths: the 126 cm run from the fuse and relay panel to the front lamp is measured. The other runs are estimates from the 3D map, which is illustrative, not measured, so measure the rear lamps, fan and fuel pump before you cut. About 20% slack is included.',
  'Your shop sells wire in black, red, blue, green, yellow and white, in 5 m and 10 m lengths, so there is no orange or purple and every row is rounded up to whole packs. I assumed every size comes in the same colours, so check the listing for each size. Red is battery and accessory feeds, yellow is ignition-switched and the fuel pump, white is relay coil triggers, blue is headlights, green is turn signals and black is ground.',
  'Prices are left out because they change. Most of these parts are on Shopee or Lazada.',
  'Check the radiator fan current rating before you choose its wire and fuse.',
  'Grounds are short on purpose: each load grounds at the nearest clean bare-metal body or chassis point. Sand off paint and rust, use a ring terminal with a star washer, then check with a multimeter that the point reads under 0.2V drop to the battery negative (see the Charging System page). The heavy loads, the fan, horn and headlights, need a solid point, so use the chassis or engine strap, not thin body sheet.',
];

export const SHOPPING: ShopSection[] = [
  {
    id: 'relays',
    title: 'Relays and flashers',
    why: 'The relays carry the load current so the dash switches only trigger the coil. A flasher is not a normal relay: it is a 3-pin unit that makes the turn and hazard lamps blink.',
    items: [
      {
        id: 'relay-40a',
        name: '12V 40A 5-pin automotive relay',
        qty: String(RELAY_COUNT + SPARE_RELAYS),
        detail: `${RELAY_COUNT} circuits plus ${SPARE_RELAYS} spares. 40A covers the fan, and one type fits every circuit. A 4-pin relay works too, since 87a is unused.`,
      },
      {
        id: 'relay-socket',
        name: '5-pin relay socket with pigtail wires',
        qty: String(RELAY_COUNT),
        detail: 'Saves crimping the small terminals. Or buy about 40 loose 6.3 mm (1/4 in) female spades, and check your relay tab size first.',
      },
      {
        id: 'flasher-3pin',
        name: '3-pin 12V electronic flasher, LED-compatible',
        qty: String(FLASHER_COUNT),
        detail: 'One for turn signals, one for hazard. Pins 49, 49a and 31. Check the rating covers all 4 lamps, or 6 if you add side markers.',
      },
    ],
  },
  {
    id: 'wire',
    title: 'Wire',
    why: 'Automotive copper wire (GXL, TXL or SAE), not copper-clad aluminium. One row per size and colour, rounded up to your shop 5 m and 10 m packs. About 20% slack is already added.',
    items: [
      wire(18, 'White', 10, 'Relay coil trigger wires, switch to pin 86, for the relays.'),
      wire(16, 'Green', 20, 'Turn signals and hazard: both flashers, both switches and all 4 lamps.'),
      wire(16, 'Black', 5, 'Relay coil grounds (pin 85) and turn and hazard lamp grounds, each to the nearest body ground. Skip a lamp that grounds through its metal bracket.'),
      wire(14, 'Red', 10, 'LED light bar feed, a long run up to the roof, and its relay supply.'),
      wire(14, 'Yellow', 9, 'Fuel pump feed from the relay to the tank, plus the starter and ignition relay feeds (ignition-switched +).'),
      wire(14, 'Black', 3, 'Fuel pump ground at the tank and LED light bar ground at its roof mount, each to the nearest body point.'),
      wire(12, 'Blue', 13, 'Headlights low and high: relay to both lamps.'),
      wire(12, 'Red', 6, 'Horn and radiator fan feeds.'),
      wire(12, 'Black', 3, 'Headlight, horn and fan grounds, each to the nearest solid body or chassis point at the front.'),
      wire(10, 'Red', 3, 'Radiator fan feed, only if it draws over 20A.', true),
    ],
  },
  {
    id: 'fuses',
    title: 'Fuses and panel',
    why: 'One fuse per circuit, in the guide panel layout: 10A turn signals, 15A hazard, 20A low beam, high beam and horn, 15A fuel pump, 30A fan, 10A LED accessory.',
    items: [
      { id: 'fuse-block', name: '16-way blade fuse block with ground bus', qty: '1', detail: 'Matches the guide 16-slot panel.' },
      {
        id: 'fuse-assort',
        name: 'Blade fuse assortment',
        qty: '1 set',
        detail: '5, 7.5, 10, 15, 20, 25, 30 and 40A, plus 2 spares each of 10, 15 and 20A.',
      },
      { id: 'fuse-puller', name: 'Fuse puller', qty: '1' },
    ],
  },
  {
    id: 'switches',
    title: 'Switches',
    why: 'Reuse any you already have that work. The hazard switch must be multi-pole so it can cut the turn flasher and feed both sides.',
    items: [
      { id: 'sw-hazard', name: 'Multi-pole dash hazard switch', qty: '1', detail: 'The guide design uses one, not diodes.' },
      { id: 'sw-turn', name: 'Turn signal switch', qty: '1', detail: 'Column lever or aftermarket.' },
      { id: 'sw-led', name: 'Dash switch for the LED accessory', qty: '1' },
      { id: 'sw-fan', name: 'Fan switch or thermostat switch', qty: '1' },
      { id: 'sw-horn', name: 'Horn button', qty: '1' },
    ],
  },
  {
    id: 'hardware',
    title: 'Connectors and hardware',
    why: 'Crimped, sealed and clamped joints are what keep a jeep harness working through vibration and rain.',
    items: [
      { id: 'hw-ring', name: 'Ring terminals, assorted for 18-10 AWG', qty: '20' },
      { id: 'hw-butt', name: 'Adhesive heat-shrink butt connectors', qty: '30' },
      { id: 'hw-lamp', name: 'Weatherproof 2-pin lamp connectors', qty: '6', detail: '4 lamps plus spares.' },
      { id: 'hw-shrink', name: 'Heat shrink tubing', qty: '1 set' },
      { id: 'hw-loom', name: 'Split loom', qty: '15 m', detail: '10 mm, plus 5 m of 13 mm for the thicker runs.' },
      { id: 'hw-clamps', name: 'Cable P-clamps', qty: '20' },
      { id: 'hw-ties', name: 'Zip ties', qty: '1 pack' },
      { id: 'hw-grommets', name: 'Firewall rubber grommets', qty: '2' },
      { id: 'hw-labels', name: 'Label tape or wire labels', qty: '1' },
      { id: 'hw-grease', name: 'Dielectric grease', qty: '1' },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    why: 'Skip any you already own.',
    items: [
      { id: 'tool-crimper', name: 'Ratchet crimper', qty: '1' },
      { id: 'tool-stripper', name: 'Wire stripper', qty: '1' },
      { id: 'tool-meter', name: 'Multimeter', qty: '1' },
      { id: 'tool-testlight', name: 'Test light', qty: '1' },
      { id: 'tool-heat', name: 'Heat gun or lighter', qty: '1' },
    ],
  },
  {
    id: 'main-feed',
    title: 'Main feed (only if you are redoing it)',
    why: 'This is the guide main-feed circuit. Skip it if your battery cable is fine.',
    items: [
      { id: 'main-red', name: '4 AWG battery cable, red', qty: '2 m', optional: true },
      { id: 'main-black', name: '4 AWG ground cable, black', qty: '1.5 m', optional: true },
      { id: 'main-fuse', name: '60-100A main fuse and holder', qty: '1', optional: true },
      { id: 'main-lugs', name: 'Battery lugs', qty: '4', optional: true },
    ],
  },
];

// Metres to buy per colour across every size, for the wire you must buy (optional wire is left out)
export function colorTotals(): { color: string; meters: number }[] {
  const totals = new Map<string, number>();
  for (const item of SHOPPING.flatMap((s) => s.items)) {
    if (!item.color || item.optional) continue;
    totals.set(item.color, (totals.get(item.color) ?? 0) + parseFloat(item.qty));
  }
  return [...totals].map(([color, meters]) => ({ color, meters })).sort((a, b) => b.meters - a.meters);
}
