import type { Circuit } from '../data/wiring-data';
import type { PartKind, SchBranch } from '../data/circuit-schematics';
import { wireColorNameFor } from '../data/jeep-map';

// One layout drives three outputs: the on-page drawing, the .kicad_sch download and the Universal
// Netlist export. Units are millimetres on KiCad's 1.27 mm grid, y grows downward on the sheet.

const COL_PITCH = 35.56;     // between branches
const PART_PITCH = 20.32;    // between part centres in a branch
const PIN = 5.08;            // pin end distance from a part centre
const TOP_NET_Y = 50.8;      // where every branch starts
const LEFT = 25.4;
const LABEL_SIZE = 1.27;   // text size written into the .kicad_sch
const SVG_TEXT = 2.0;      // the page drawing is shown smaller than a KiCad window, so its text is larger

// ------------------------------------------------------------------ symbols
type Art =
  | { t: 'rect'; x1: number; y1: number; x2: number; y2: number }
  | { t: 'poly'; pts: [number, number][] }
  | { t: 'circle'; r: number }
  | { t: 'text'; text: string; size: number; x: number; y: number };

const BLADE: Art[] = [
  { t: 'poly', pts: [[0, 2.54], [0, 1.27]] },
  { t: 'poly', pts: [[0, -2.54], [0, -1.27]] },
  { t: 'poly', pts: [[0, 1.27], [1.524, -0.508]] },
];
const CROSS: Art[] = [
  { t: 'poly', pts: [[-1.796, -1.796], [1.796, 1.796]] },
  { t: 'poly', pts: [[-1.796, 1.796], [1.796, -1.796]] },
];

// Part drawings in KiCad symbol coordinates (y up). Pins are at (0, +5.08) and (0, -5.08), length 2.54.
export const SYMBOL_ART: Record<PartKind, Art[]> = {
  fuse: [{ t: 'rect', x1: -0.762, y1: -2.54, x2: 0.762, y2: 2.54 }, { t: 'poly', pts: [[0, -2.54], [0, 2.54]] }],
  switch: BLADE,
  relayContact: BLADE,
  relayCoil: [{ t: 'rect', x1: -1.016, y1: -2.54, x2: 1.016, y2: 2.54 }],
  lamp: [{ t: 'circle', r: 2.54 }, ...CROSS],
  motor: [{ t: 'circle', r: 2.54 }, { t: 'text', text: 'M', size: 2.54, x: 0, y: 0 }],
  alternator: [{ t: 'circle', r: 2.54 }, { t: 'text', text: 'G', size: 2.54, x: 0, y: 0 }],
  load: [{ t: 'rect', x1: -2.54, y1: -2.54, x2: 2.54, y2: 2.54 }],
  cable: [
    { t: 'rect', x1: -0.508, y1: -1.905, x2: 0.508, y2: 1.905 },
    { t: 'poly', pts: [[0, 2.54], [0, 1.905]] },
    { t: 'poly', pts: [[0, -1.905], [0, -2.54]] },
  ],
  battery: [
    { t: 'poly', pts: [[-1.524, 0.762], [1.524, 0.762]] },
    { t: 'poly', pts: [[-0.762, -0.762], [0.762, -0.762]] },
    { t: 'poly', pts: [[0, 2.54], [0, 0.762]] },
    { t: 'poly', pts: [[0, -0.762], [0, -2.54]] },
    { t: 'text', text: '+', size: 1.27, x: 2.2, y: 1.9 },
  ],
};

const GROUND_ART: Art[] = [{ t: 'poly', pts: [[0, 0], [0, -1.27], [1.27, -1.27], [0, -2.54], [-1.27, -1.27], [0, -1.27]] }];

const SYMBOL_NAME: Record<PartKind, string> = {
  fuse: 'Fuse', switch: 'Switch', relayCoil: 'Relay_Coil', relayContact: 'Relay_Contact', lamp: 'Lamp',
  motor: 'Motor', alternator: 'Alternator', load: 'Load', cable: 'Cable', battery: 'Battery',
};
const REF_PREFIX: Record<PartKind, string> = {
  fuse: 'F', switch: 'SW', relayCoil: 'K', relayContact: 'K', lamp: 'LP', motor: 'M', alternator: 'G', load: 'LD',
  cable: 'W', battery: 'BT',
};
export const PART_DESCRIPTION: Record<PartKind, string> = {
  fuse: 'Fuse', switch: 'Switch', relayCoil: 'Relay coil', relayContact: 'Relay contact', lamp: 'Lamp',
  motor: 'Motor', alternator: 'AC alternator', load: 'Load', cable: 'Heavy cable', battery: 'Battery',
};

// ------------------------------------------------------------------- layout
export interface PlacedPart { ref: string; value: string; kind: PartKind; x: number; y: number; branch: number }
export interface Segment { x1: number; y1: number; x2: number; y2: number; branch: number }
export interface Marker { text: string; x: number; y: number; branch: number }

export interface Layout {
  parts: PlacedPart[];
  wires: Segment[];
  netLabels: Marker[];
  grounds: { ref: string; x: number; y: number; branch: number }[];
  notes: Marker[];
  captions: Marker[];   // short column headings, drawn on the page only (not written to the .kicad_sch)
  title: string;
  info: string[];
  bounds: { x1: number; y1: number; x2: number; y2: number };
}

// "14-10 AWG (by fan current)" -> "14-10 AWG"
export function wireLabel(circuit: Circuit): string {
  return circuit.wireGauge.match(/\d+(?:\s*[–-]\s*\d+)?\s*AWG/i)?.[0].replace(/\s+/g, ' ') ?? circuit.wireGauge;
}

// A short heading for a branch, worked out from its parts so the data needs no extra field
export function branchTitle(branch: SchBranch): string {
  const kinds = branch.parts.map((p) => p.kind);
  const last = branch.parts[branch.parts.length - 1];
  if (kinds.includes('battery')) return 'Battery';
  if (kinds.includes('relayCoil')) return 'Relay control';
  if (kinds.includes('alternator')) return 'Alternator';
  if (kinds.includes('relayContact')) return 'Relay power';
  if (last.kind === 'lamp' || last.kind === 'motor' || last.kind === 'load') return last.value;
  if (kinds.includes('cable')) return 'Heavy cable';
  if (kinds.includes('switch')) return 'Switched feed';
  return 'Fused feed';
}

export function layoutSchematic(spec: SchBranch[], circuit: Circuit): Layout {
  const layout: Layout = {
    parts: [], wires: [], netLabels: [], grounds: [], notes: [], captions: [],
    title: circuit.name,
    info: [`Wire: ${circuit.wireGauge}`, `Fuse: ${circuit.fuse}`, 'Illustrative schematic, not a harness drawing'],
    bounds: { x1: LEFT - 8, y1: TOP_NET_Y - 13, x2: LEFT + (spec.length - 1) * COL_PITCH + 32, y2: 0 },
  };
  let groundCount = 0;
  let maxY = 0;

  spec.forEach((branch, i) => {
    const x = LEFT + i * COL_PITCH;
    const centre = (j: number) => TOP_NET_Y + 10.16 + PIN + j * PART_PITCH;
    const last = branch.parts.length - 1;
    const bottomY = centre(last) + PIN + 10.16;

    layout.captions.push({ text: branchTitle(branch), x, y: TOP_NET_Y - 7, branch: i });
    layout.netLabels.push({ text: branch.top, x, y: TOP_NET_Y, branch: i });
    layout.wires.push({ x1: x, y1: TOP_NET_Y, x2: x, y2: centre(0) - PIN, branch: i });
    branch.parts.forEach((part, j) => {
      layout.parts.push({ ref: part.ref, value: part.value, kind: part.kind, x, y: centre(j), branch: i });
      if (j < last) layout.wires.push({ x1: x, y1: centre(j) + PIN, x2: x, y2: centre(j + 1) - PIN, branch: i });
    });
    layout.wires.push({ x1: x, y1: centre(last) + PIN, x2: x, y2: bottomY, branch: i });

    if (branch.bottom === 'GND') layout.grounds.push({ ref: `#PWR0${++groundCount}`, x, y: bottomY, branch: i });
    else layout.netLabels.push({ text: branch.bottom, x, y: bottomY, branch: i });

    if (branch.wired) {
      layout.notes.push({ text: `${wireLabel(circuit)} ${wireColorNameFor(circuit.id).toUpperCase()}`, x: x + 1.27, y: TOP_NET_Y + 5.08, branch: i });
    }
    maxY = Math.max(maxY, bottomY + 6.5);
  });

  layout.bounds.y2 = maxY;
  return layout;
}

// --------------------------------------------------------------- SVG drawing
export type PaperId = 'dark' | 'kicad';

export interface Palette {
  paper: string; wire: string; body: string; fill: string; text: string; label: string; note: string; accent: string;
}

// kicad: KiCad's default light colours. dark: the site's colours, so the sheet sits in the page.
export const PALETTES: Record<PaperId, Palette> = {
  kicad: { paper: '#F5F4EF', wire: '#008400', body: '#840000', fill: '#FFFFC2', text: '#006464', label: '#0F0F0F', note: '#4D4D4D', accent: '#C2410C' },
  dark: { paper: '#14171D', wire: '#4ADE80', body: '#FFA24D', fill: '#2B2118', text: '#8FE3E0', label: '#E8E9EC', note: '#A8AEBA', accent: '#FFD166' },
};

export interface SvgScene {
  viewBox: string;
  width: number;     // millimetres, used to size the picture
  height: number;
  paper: string;
  lines: { x1: number; y1: number; x2: number; y2: number; stroke: string; w: number; opacity: number }[];
  rects: { x: number; y: number; w: number; h: number; stroke: string; fill: string; opacity: number }[];
  circles: { cx: number; cy: number; r: number; stroke: string; fill: string; opacity: number }[];
  texts: { x: number; y: number; text: string; size: number; fill: string; anchor: 'start' | 'middle'; bold?: boolean; opacity: number }[];
  hits: { ref: string; label: string; x: number; y: number; w: number; h: number; selected: boolean }[];
}

// Which branches and part to emphasise; null draws everything normally
export interface Highlight { ref: string; branches: number[] }

const SYMBOL_STROKE = 0.254;
const DIMMED = 0.25;

function addArt(scene: SvgScene, pal: Palette, art: Art[], cx: number, cy: number, stroke: string, opacity: number): void {
  for (const a of art) {
    if (a.t === 'rect') {
      scene.rects.push({
        x: cx + Math.min(a.x1, a.x2), y: cy - Math.max(a.y1, a.y2),
        w: Math.abs(a.x2 - a.x1), h: Math.abs(a.y2 - a.y1), stroke, fill: pal.fill, opacity,
      });
    } else if (a.t === 'circle') {
      scene.circles.push({ cx, cy, r: a.r, stroke, fill: pal.fill, opacity });
    } else if (a.t === 'poly') {
      for (let k = 0; k < a.pts.length - 1; k++) {
        scene.lines.push({
          x1: cx + a.pts[k][0], y1: cy - a.pts[k][1], x2: cx + a.pts[k + 1][0], y2: cy - a.pts[k + 1][1],
          stroke, w: SYMBOL_STROKE, opacity,
        });
      }
    } else {
      scene.texts.push({ x: cx + a.x, y: cy - a.y + a.size * 0.35, text: a.text, size: a.size, fill: stroke, anchor: 'middle', opacity });
    }
  }
}

const emptyScene = (pal: Palette, box: { x: number; y: number; w: number; h: number }): SvgScene => ({
  viewBox: `${box.x} ${box.y} ${box.w} ${box.h}`, width: box.w, height: box.h, paper: pal.paper,
  lines: [], rects: [], circles: [], texts: [], hits: [],
});

export function toSvgScene(layout: Layout, pal: Palette = PALETTES.kicad, highlight: Highlight | null = null): SvgScene {
  const pad = 3;
  const { x1, y1, x2, y2 } = layout.bounds;
  const scene = emptyScene(pal, { x: x1 - pad, y: y1 - pad, w: x2 - x1 + 2 * pad, h: y2 - y1 + 2 * pad });
  const lit = (branch: number) => !highlight || highlight.branches.includes(branch);
  const op = (branch: number) => (lit(branch) ? 1 : DIMMED);
  const SIZE = 2.1;   // the page drawing is shown smaller than a KiCad window, so its text is larger than the file's

  for (const w of layout.wires) {
    scene.lines.push({ ...w, stroke: highlight && lit(w.branch) ? pal.accent : pal.wire, w: highlight && lit(w.branch) ? 0.5 : 0.3, opacity: op(w.branch) });
  }
  for (const part of layout.parts) {
    const selected = highlight?.ref === part.ref;
    const body = selected ? pal.accent : pal.body;
    const o = op(part.branch);
    scene.lines.push({ x1: part.x, y1: part.y - PIN, x2: part.x, y2: part.y - 2.54, stroke: body, w: SYMBOL_STROKE, opacity: o });
    scene.lines.push({ x1: part.x, y1: part.y + 2.54, x2: part.x, y2: part.y + PIN, stroke: body, w: SYMBOL_STROKE, opacity: o });
    addArt(scene, pal, SYMBOL_ART[part.kind], part.x, part.y, body, o);
    scene.texts.push({ x: part.x + 3.81, y: part.y - 0.8, text: part.ref, size: SIZE, fill: pal.text, anchor: 'start', bold: selected, opacity: o });
    scene.texts.push({ x: part.x + 3.81, y: part.y + 2.2, text: part.value, size: SIZE, fill: pal.text, anchor: 'start', opacity: o });
    // finger-sized target covering the part and its pins
    scene.hits.push({ ref: part.ref, label: `${part.ref}, ${part.value}`, x: part.x - 7, y: part.y - 7.5, w: 14, h: 15, selected });
  }
  for (const g of layout.grounds) {
    addArt(scene, pal, GROUND_ART, g.x, g.y, pal.body, op(g.branch));
    scene.texts.push({ x: g.x, y: g.y + 5.4, text: 'GND', size: SIZE, fill: pal.text, anchor: 'middle', opacity: op(g.branch) });
  }
  for (const l of layout.netLabels) {
    scene.texts.push({ x: l.x + 0.8, y: l.y - 1, text: l.text, size: SIZE, fill: pal.label, anchor: 'start', opacity: op(l.branch) });
    scene.circles.push({ cx: l.x, cy: l.y, r: 0.4, stroke: pal.wire, fill: pal.wire, opacity: op(l.branch) });
  }
  for (const n of layout.notes) scene.texts.push({ x: n.x, y: n.y, text: n.text, size: 1.8, fill: pal.note, anchor: 'start', opacity: op(n.branch) });
  for (const c of layout.captions) {
    scene.texts.push({ x: c.x, y: c.y, text: c.text.toUpperCase(), size: 1.7, fill: pal.note, anchor: 'start', bold: true, opacity: op(c.branch) });
  }
  return scene;
}

// ---------------------------------------------------------- explanations
export const PART_HELP: Record<PartKind, { name: string; help: string }> = {
  battery: { name: 'Battery', help: 'The 12 V source for the circuit.' },
  alternator: { name: 'Alternator', help: 'Charges the battery while the engine runs (AC alternator with a built-in rectifier).' },
  fuse: { name: 'Fuse', help: 'Protects the wire: it blows before the wire can overheat.' },
  switch: { name: 'Switch', help: 'Opens and closes the circuit when you operate it.' },
  relayCoil: { name: 'Relay coil', help: 'A small current through the coil closes the relay contact.' },
  relayContact: { name: 'Relay contact', help: 'Carries the heavy load current once the coil is energised.' },
  lamp: { name: 'Lamp', help: 'Lights up when current flows through it.' },
  motor: { name: 'Motor', help: 'Turns when current flows through it.' },
  load: { name: 'Load', help: 'The accessory this circuit powers.' },
  cable: { name: 'Heavy cable', help: 'A large-gauge cable that carries high current with little voltage drop.' },
};

export interface PartLink { side: 'top' | 'bottom'; net: string; others: { ref: string; value: string }[] }
export interface PartDescription {
  ref: string;
  value: string;
  kind: PartKind;
  name: string;
  help: string;
  links: PartLink[];
  partner?: { ref: string; value: string; kind: PartKind };   // the other half of a relay
  branches: number[];                                          // branches to light up
}

const netsOf = (branch: SchBranch, index: number) =>
  branch.parts.flatMap((_, j) => [
    j === 0 ? branch.top : `N${index + 1}_${j}`,
    j === branch.parts.length - 1 ? branch.bottom : `N${index + 1}_${j + 1}`,
  ]);

// Everything the info panel and the highlight need about one part
export function describePart(spec: SchBranch[], ref: string): PartDescription | undefined {
  const located = spec.flatMap((b, i) => b.parts.map((p, j) => ({ b, i, j, p }))).find((x) => x.p.ref === ref);
  if (!located) return undefined;
  const { b, i, j, p } = located;
  const { nets } = buildNetlistContent(spec);
  const valueOf = (r: string) => spec.flatMap((x) => x.parts).find((x) => x.ref === r)!.value;

  const sides: [PartLink['side'], string][] = [
    ['top', j === 0 ? b.top : `N${i + 1}_${j}`],
    ['bottom', j === b.parts.length - 1 ? b.bottom : `N${i + 1}_${j + 1}`],
  ];
  const links = sides.map(([side, net]): PartLink => ({
    side, net,
    others: Object.keys(nets[net] ?? {}).filter((r) => r !== ref).map((r) => ({ ref: r, value: valueOf(r) })),
  }));

  // a relay coil K1 pairs with its contact K1-1
  const partnerKind: PartKind | undefined = p.kind === 'relayCoil' ? 'relayContact' : p.kind === 'relayContact' ? 'relayCoil' : undefined;
  const partnerPart = partnerKind
    ? spec.flatMap((x) => x.parts).find((x) => x.kind === partnerKind && (p.kind === 'relayCoil' ? x.ref.startsWith(`${ref}-`) : ref.startsWith(`${x.ref}-`)))
    : undefined;

  // light this branch, branches sharing one of this part's nets (GND would light everything), and the relay partner's
  const shared = new Set(links.map((l) => l.net).filter((n) => n !== 'GND'));
  const branches = new Set<number>([i]);
  spec.forEach((other, k) => {
    if (netsOf(other, k).some((n) => shared.has(n))) branches.add(k);
    if (partnerPart && other.parts.some((x) => x.ref === partnerPart.ref)) branches.add(k);
  });

  return {
    ref, value: p.value, kind: p.kind, ...PART_HELP[p.kind], links,
    partner: partnerPart && { ref: partnerPart.ref, value: partnerPart.value, kind: partnerPart.kind },
    branches: [...branches].sort((x, y) => x - y),
  };
}

export interface LegendItem { name: string; help: string; icon: SvgScene }

// A small drawing of one symbol on its own, for the legend
export function partIcon(kind: PartKind | 'ground', pal: Palette): SvgScene {
  const scene = emptyScene(pal, { x: -5, y: -6.5, w: 10, h: 13 });
  if (kind === 'ground') {
    scene.lines.push({ x1: 0, y1: -5.5, x2: 0, y2: -0, stroke: pal.wire, w: 0.3, opacity: 1 });
    addArt(scene, pal, GROUND_ART, 0, 0, pal.body, 1);
    return scene;
  }
  scene.lines.push({ x1: 0, y1: -PIN, x2: 0, y2: -2.54, stroke: pal.body, w: SYMBOL_STROKE, opacity: 1 });
  scene.lines.push({ x1: 0, y1: 2.54, x2: 0, y2: PIN, stroke: pal.body, w: SYMBOL_STROKE, opacity: 1 });
  addArt(scene, pal, SYMBOL_ART[kind], 0, 0, pal.body, 1);
  return scene;
}

// Only the symbols this circuit uses, in order of first appearance, plus the ground symbol if it has one
export function legendItems(spec: SchBranch[], pal: Palette): LegendItem[] {
  const kinds = [...new Set(spec.flatMap((b) => b.parts.map((p) => p.kind)))];
  const items: LegendItem[] = kinds.map((k) => ({ ...PART_HELP[k], icon: partIcon(k, pal) }));
  if (spec.some((b) => b.bottom === 'GND')) {
    items.push({ name: 'GND', help: 'Chassis and return path back to the battery negative.', icon: partIcon('ground', pal) });
  }
  return items;
}

// ------------------------------------------------------ KiCad .kicad_sch file
type Sx = string | number | Sx[] | { q: string };
const Q = (s: string): Sx => ({ q: s });
const num = (n: number) => String(Math.round(n * 1e4) / 1e4);

function serialise(s: Sx, depth = 0): string {
  if (typeof s === 'number') return num(s);
  if (typeof s === 'string') return s;
  if (!Array.isArray(s)) return `"${s.q.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const flat = '(' + s.map((x) => serialise(x, depth + 1)).join(' ') + ')';
  if (flat.length <= 100 && !flat.includes('\n')) return flat;
  const pad = '  '.repeat(depth + 1);
  const [head, ...rest] = s;
  return '(' + serialise(head, depth + 1) + '\n' + rest.map((x) => pad + serialise(x, depth + 1)).join('\n') + '\n' + '  '.repeat(depth) + ')';
}

// Deterministic v4-shaped id so a circuit always downloads the same file
export function uuidFrom(seed: string): string {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  const hex = [h1, h2, h3, h4].map((h) => (h >>> 0).toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const FONT: Sx = ['font', ['size', 1.27, 1.27]];
const STROKE: Sx = ['stroke', ['width', 0.254], ['type', 'default']];
const LIB = 'JeepWiring';

function libSymbol(name: string, prefix: string, description: string, art: Art[], power = false): Sx {
  const graphics: Sx[] = art.map((a): Sx => {
    if (a.t === 'rect') return ['rectangle', ['start', a.x1, a.y1], ['end', a.x2, a.y2], STROKE, ['fill', ['type', 'background']]];
    if (a.t === 'circle') return ['circle', ['center', 0, 0], ['radius', a.r], STROKE, ['fill', ['type', 'background']]];
    if (a.t === 'poly') return ['polyline', ['pts', ...a.pts.map(([x, y]): Sx => ['xy', x, y])], STROKE, ['fill', ['type', 'none']]];
    return ['text', Q(a.text), ['at', a.x, a.y, 0], ['effects', ['font', ['size', a.size, a.size]]]];
  });
  const pin = (n: string, y: number, angle: number): Sx => [
    'pin', 'passive', 'line', ['at', 0, y, angle], ['length', 2.54],
    ['name', Q('~'), ['effects', FONT]], ['number', Q(n), ['effects', FONT]],
  ];
  const hidden = (k: string, v: string): Sx => ['property', Q(k), Q(v), ['at', 0, 0, 0], ['effects', FONT, 'hide']];
  if (power) {
    return [
      'symbol', Q(`${LIB}:${name}`), ['power'], ['pin_numbers', 'hide'], ['pin_names', ['offset', 0], 'hide'],
      ['exclude_from_sim', 'no'], ['in_bom', 'no'], ['on_board', 'yes'],
      ['property', Q('Reference'), Q('#PWR'), ['at', 0, -6.35, 0], ['effects', FONT, 'hide']],
      ['property', Q('Value'), Q('GND'), ['at', 0, -3.81, 0], ['effects', FONT]],
      hidden('Footprint', ''), hidden('Datasheet', ''), hidden('Description', description),
      ['symbol', Q(`${name}_0_1`), ...graphics],
      ['symbol', Q(`${name}_1_1`), ['pin', 'power_in', 'line', ['at', 0, 0, 270], ['length', 0], 'hide',
        ['name', Q('GND'), ['effects', FONT]], ['number', Q('1'), ['effects', FONT]]]],
    ];
  }
  return [
    'symbol', Q(`${LIB}:${name}`), ['pin_numbers', 'hide'], ['pin_names', ['offset', 0], 'hide'],
    ['exclude_from_sim', 'no'], ['in_bom', 'yes'], ['on_board', 'yes'],
    ['property', Q('Reference'), Q(prefix), ['at', 2.032, 0, 90], ['effects', FONT]],
    ['property', Q('Value'), Q(name), ['at', -2.032, 0, 90], ['effects', FONT]],
    hidden('Footprint', ''), hidden('Datasheet', ''), hidden('Description', description),
    ['symbol', Q(`${name}_0_1`), ...graphics],
    ['symbol', Q(`${name}_1_1`), pin('1', PIN, 270), pin('2', -PIN, 90)],
  ];
}

export interface KicadMeta { date?: string }

export function toKicadSch(layout: Layout, circuit: Circuit, meta: KicadMeta = {}): string {
  const root = uuidFrom(`jeep-wiring/${circuit.id}`);
  let n = 0;
  const id = (what: string) => Q(uuidFrom(`${circuit.id}/${what}/${n++}`));
  const kinds = [...new Set(layout.parts.map((p) => p.kind))];
  const textEffects: Sx = ['effects', FONT, ['justify', 'left', 'bottom']];
  const props = (ref: string, value: string, x: number, y: number, hideRef = false): Sx[] => [
    ['property', Q('Reference'), Q(ref), ['at', x + 3.81, y - 1.27, 0], ['effects', FONT, ['justify', 'left'], ...(hideRef ? ['hide'] : [])]],
    ['property', Q('Value'), Q(value), ['at', x + 3.81, y + 1.27, 0], ['effects', FONT, ['justify', 'left']]],
    ['property', Q('Footprint'), Q(''), ['at', x, y, 0], ['effects', FONT, 'hide']],
    ['property', Q('Datasheet'), Q(''), ['at', x, y, 0], ['effects', FONT, 'hide']],
  ];
  const instance = (ref: string): Sx => ['instances', ['project', Q('jeep-wiring'), ['path', Q(`/${root}`), ['reference', Q(ref)], ['unit', 1]]]];

  const sheet: Sx[] = [
    'kicad_sch', ['version', 20231120], ['generator', Q('eeschema')], ['generator_version', Q('8.0')],
    ['uuid', Q(root)], ['paper', Q('A4')],
    ['title_block', ['title', Q(layout.title)], ['date', Q(meta.date ?? new Date().toISOString().slice(0, 10))],
      ['rev', Q('1')], ['company', Q('Jeep Wiring Guide')],
      ...layout.info.map((line, i): Sx => ['comment', i + 1, Q(line)])],
    ['lib_symbols',
      ...kinds.map((k) => libSymbol(SYMBOL_NAME[k], REF_PREFIX[k], PART_DESCRIPTION[k], SYMBOL_ART[k])),
      ...(layout.grounds.length ? [libSymbol('GND', '#PWR', 'Ground', GROUND_ART, true)] : [])],
  ];

  for (const w of layout.wires) {
    sheet.push(['wire', ['pts', ['xy', w.x1, w.y1], ['xy', w.x2, w.y2]], ['stroke', ['width', 0], ['type', 'default']], ['uuid', id('wire')]]);
  }
  for (const l of layout.netLabels) {
    sheet.push(['label', Q(l.text), ['at', l.x, l.y, 0], ['effects', FONT, ['justify', 'left', 'bottom']], ['uuid', id('label')]]);
  }
  for (const t of layout.notes) {
    sheet.push(['text', Q(t.text), ['exclude_from_sim', 'no'], ['at', t.x, t.y, 0], textEffects, ['uuid', id('text')]]);
  }
  for (const p of layout.parts) {
    sheet.push([
      'symbol', ['lib_id', Q(`${LIB}:${SYMBOL_NAME[p.kind]}`)], ['at', p.x, p.y, 0], ['unit', 1],
      ['exclude_from_sim', 'no'], ['in_bom', 'yes'], ['on_board', 'yes'], ['dnp', 'no'], ['uuid', id('part')],
      ...props(p.ref, p.value, p.x, p.y),
      ['pin', Q('1'), ['uuid', id('pin')]], ['pin', Q('2'), ['uuid', id('pin')]],
      instance(p.ref),
    ]);
  }
  for (const g of layout.grounds) {
    sheet.push([
      'symbol', ['lib_id', Q(`${LIB}:GND`)], ['at', g.x, g.y, 0], ['unit', 1],
      ['exclude_from_sim', 'no'], ['in_bom', 'no'], ['on_board', 'yes'], ['dnp', 'no'], ['uuid', id('gnd')],
      ['property', Q('Reference'), Q(g.ref), ['at', g.x, g.y - 6.35, 0], ['effects', FONT, 'hide']],
      ['property', Q('Value'), Q('GND'), ['at', g.x, g.y + 3.81, 0], ['effects', FONT]],
      ['property', Q('Footprint'), Q(''), ['at', g.x, g.y, 0], ['effects', FONT, 'hide']],
      ['property', Q('Datasheet'), Q(''), ['at', g.x, g.y, 0], ['effects', FONT, 'hide']],
      ['pin', Q('1'), ['uuid', id('pin')]],
      instance(g.ref),
    ]);
  }
  sheet.push(['sheet_instances', ['path', Q('/'), ['page', Q('1')]]]);
  return serialise(sheet) + '\n';
}

// ------------------------------------------------- Universal Netlist export
// Format: https://github.com/IntelligentElectron/universal-netlist (schema version 2). The package
// loads and electrically checks these files; see scripts/check-netlists.ts.
export interface UniversalNetlist {
  universalNetlistSchemaVersion: 2;
  metadata: { generatedAt: string; netlistHash: string; origin: { type: 'native' } };
  nets: Record<string, Record<string, string[]>>;
  components: Record<string, { value: string; description: string; pins: Record<string, string> }>;
}

// Pin 1 is the top of a part and pin 2 the bottom. Nets between two parts in a branch are named N<branch>_<n>.
export function buildNetlistContent(spec: SchBranch[]): Pick<UniversalNetlist, 'nets' | 'components'> {
  const components: UniversalNetlist['components'] = {};
  const nets: UniversalNetlist['nets'] = {};
  const connect = (net: string, ref: string, pin: string) => {
    // pin lists are arrays because the package hashes the form it reads back (a lone string becomes an array)
    ((nets[net] ??= {})[ref] ??= []).push(pin);
  };

  spec.forEach((branch, b) => {
    branch.parts.forEach((part, j) => {
      const upper = j === 0 ? branch.top : `N${b + 1}_${j}`;
      const lower = j === branch.parts.length - 1 ? branch.bottom : `N${b + 1}_${j + 1}`;
      components[part.ref] = { value: part.value, description: PART_DESCRIPTION[part.kind], pins: { '1': upper, '2': lower } };
      connect(upper, part.ref, '1');
      connect(lower, part.ref, '2');
    });
  });
  return { nets, components };
}

// Same canonical form the package hashes: keys sorted recursively, arrays kept in order
const canonicalize = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canonicalize);
  if (v === null || typeof v !== 'object') return v;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v as object).sort()) out[k] = canonicalize((v as Record<string, unknown>)[k]);
  return out;
};

export async function netlistHash(content: Pick<UniversalNetlist, 'nets' | 'components'>): Promise<string> {
  const text = JSON.stringify(canonicalize({ nets: content.nets, components: content.components }));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return 'sha256:' + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function toUniversalNetlist(spec: SchBranch[], now = new Date()): Promise<UniversalNetlist> {
  const content = buildNetlistContent(spec);
  return {
    universalNetlistSchemaVersion: 2,
    metadata: { generatedAt: now.toISOString(), netlistHash: await netlistHash(content), origin: { type: 'native' } },
    ...content,
  };
}
