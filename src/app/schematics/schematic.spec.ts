import { CIRCUITS } from '../data/wiring-data';
import { CIRCUIT_SCHEMATICS } from '../data/circuit-schematics';
import {
  PALETTES, branchTitle, buildNetlistContent, describePart, layoutSchematic, legendItems, toKicadSch, toSvgScene,
  toUniversalNetlist, uuidFrom, wireLabel,
} from './schematic';

// Minimal S-expression reader: enough to prove the .kicad_sch text is well formed
type Sx = string | Sx[];
function parseSexp(text: string): Sx {
  let i = 0;
  const read = (): Sx => {
    while (/\s/.test(text[i])) i++;
    if (text[i] === '(') {
      i++;
      const list: Sx[] = [];
      for (;;) {
        while (/\s/.test(text[i])) i++;
        if (text[i] === ')') { i++; return list; }
        if (i >= text.length) throw new Error('unbalanced parentheses');
        list.push(read());
      }
    }
    if (text[i] === '"') {
      let out = '';
      i++;
      while (text[i] !== '"') {
        if (i >= text.length) throw new Error('unterminated string');
        if (text[i] === '\\') i++;
        out += text[i++];
      }
      i++;
      return out;
    }
    const start = i;
    while (i < text.length && !/[\s()]/.test(text[i])) i++;
    return text.slice(start, i);
  };
  const result = read();
  while (i < text.length && /\s/.test(text[i])) i++;
  if (i < text.length) throw new Error('text after the closing parenthesis');
  return result;
}

const find = (list: Sx[], head: string): Sx[][] => list.filter((x): x is Sx[] => Array.isArray(x) && x[0] === head);
const onGrid = (n: number) => Math.abs(n / 1.27 - Math.round(n / 1.27)) < 1e-6;

describe('circuit schematics', () => {
  it('has a schematic for every circuit and none for a missing one', () => {
    expect(CIRCUITS.filter((c) => !CIRCUIT_SCHEMATICS[c.id]?.length).map((c) => c.id)).toEqual([]);
    expect(Object.keys(CIRCUIT_SCHEMATICS).filter((id) => !CIRCUITS.some((c) => c.id === id))).toEqual([]);
  });

  it('gives every part a unique reference within its circuit', () => {
    for (const [id, spec] of Object.entries(CIRCUIT_SCHEMATICS)) {
      const refs = spec.flatMap((b) => b.parts.map((p) => p.ref));
      expect(new Set(refs).size).withContext(id).toBe(refs.length);
    }
  });

  it('puts every coordinate on the 1.27 mm grid and every wire end on a pin or net point', () => {
    for (const circuit of CIRCUITS) {
      const layout = layoutSchematic(CIRCUIT_SCHEMATICS[circuit.id], circuit);
      const points = new Set<string>();
      const key = (x: number, y: number) => `${x.toFixed(3)},${y.toFixed(3)}`;
      for (const p of layout.parts) { points.add(key(p.x, p.y - 5.08)); points.add(key(p.x, p.y + 5.08)); }
      for (const l of layout.netLabels) points.add(key(l.x, l.y));
      for (const g of layout.grounds) points.add(key(g.x, g.y));

      for (const w of layout.wires) {
        for (const [x, y] of [[w.x1, w.y1], [w.x2, w.y2]]) {
          expect(points.has(key(x, y))).withContext(`${circuit.id} wire end ${x},${y}`).toBe(true);
          expect(onGrid(x) && onGrid(y)).withContext(`${circuit.id} off grid ${x},${y}`).toBe(true);
        }
      }
      for (const p of layout.parts) expect(onGrid(p.x) && onGrid(p.y)).withContext(`${circuit.id} ${p.ref}`).toBe(true);
    }
  });

  it('never places two parts on the same spot and keeps the sheet inside A4', () => {
    for (const circuit of CIRCUITS) {
      const layout = layoutSchematic(CIRCUIT_SCHEMATICS[circuit.id], circuit);
      const spots = layout.parts.map((p) => `${p.x},${p.y}`);
      expect(new Set(spots).size).withContext(circuit.id).toBe(spots.length);
      expect(layout.bounds.x2).withContext(circuit.id).toBeLessThan(297);
      expect(layout.bounds.y2).withContext(circuit.id).toBeLessThan(190);
    }
  });

  it('draws the same parts it lays out', () => {
    const circuit = CIRCUITS.find((c) => c.id === 'headlight-low')!;
    const layout = layoutSchematic(CIRCUIT_SCHEMATICS[circuit.id], circuit);
    const scene = toSvgScene(layout);
    for (const p of layout.parts) expect(scene.texts.some((t) => t.text === p.ref)).withContext(p.ref).toBe(true);
    expect(scene.lines.length).toBeGreaterThan(layout.wires.length);
  });
});

describe('KiCad file', () => {
  it('is well formed for every circuit', () => {
    for (const circuit of CIRCUITS) {
      const layout = layoutSchematic(CIRCUIT_SCHEMATICS[circuit.id], circuit);
      const text = toKicadSch(layout, circuit, { date: '2026-10-27' });
      const root = parseSexp(text) as Sx[];
      expect(root[0]).withContext(circuit.id).toBe('kicad_sch');

      // every UUID unique
      const uuids = [...text.matchAll(/\(uuid "([0-9a-f-]{36})"\)/g)].map((m) => m[1]);
      expect(new Set(uuids).size).withContext(circuit.id).toBe(uuids.length);

      // every lib_id has a lib_symbols entry
      const lib = find(find(root, 'lib_symbols')[0] as Sx[], 'symbol').map((s) => s[1] as string);
      const used = find(root, 'symbol').map((s) => ((find(s, 'lib_id')[0] as Sx[])[1] as string));
      for (const id of used) expect(lib).withContext(`${circuit.id} ${id}`).toContain(id);

      // one symbol per part and per ground, wires and labels as laid out
      expect(find(root, 'symbol').length).withContext(circuit.id).toBe(layout.parts.length + layout.grounds.length);
      expect(find(root, 'wire').length).withContext(circuit.id).toBe(layout.wires.length);
      expect(find(root, 'label').length).withContext(circuit.id).toBe(layout.netLabels.length);
    }
  });

  it('is identical every time for the same circuit', () => {
    const circuit = CIRCUITS[0];
    const layout = layoutSchematic(CIRCUIT_SCHEMATICS[circuit.id], circuit);
    expect(toKicadSch(layout, circuit, { date: 'x' })).toBe(toKicadSch(layout, circuit, { date: 'x' }));
    expect(uuidFrom('a')).not.toBe(uuidFrom('b'));
  });

  it('quotes text that contains quotes or backslashes', () => {
    const circuit = { ...CIRCUITS[0], name: 'Say "hi" \\ there' };
    const text = toKicadSch(layoutSchematic(CIRCUIT_SCHEMATICS[circuit.id], circuit), circuit);
    const title = find(find(parseSexp(text) as Sx[], 'title_block')[0] as Sx[], 'title')[0];
    expect(title[1]).toBe('Say "hi" \\ there');
  });
});

describe('Universal Netlist export', () => {
  it('lists every pin under its net and every net under its pins', () => {
    for (const [id, spec] of Object.entries(CIRCUIT_SCHEMATICS)) {
      const { nets, components } = buildNetlistContent(spec);
      for (const [ref, comp] of Object.entries(components)) {
        for (const [pin, net] of Object.entries(comp.pins)) {
          expect(nets[net]?.[ref]).withContext(`${id} ${ref}.${pin}`).toContain(pin);
        }
      }
      for (const [net, members] of Object.entries(nets)) {
        for (const [ref, pins] of Object.entries(members)) {
          for (const pin of pins) expect(components[ref].pins[pin]).withContext(`${id} ${net}`).toBe(net);
        }
      }
    }
  });

  it('has no net with a single connection', () => {
    for (const [id, spec] of Object.entries(CIRCUIT_SCHEMATICS)) {
      const { nets } = buildNetlistContent(spec);
      for (const [net, members] of Object.entries(nets)) {
        const count = Object.values(members).reduce((n, pins) => n + pins.length, 0);
        expect(count).withContext(`${id} net ${net}`).toBeGreaterThan(1);
      }
    }
  });

  it('writes a schema 2 document with a sha256 hash that only depends on the connections', async () => {
    const spec = CIRCUIT_SCHEMATICS['horn'];
    const a = await toUniversalNetlist(spec, new Date('2026-10-27T10:00:00.123Z'));
    const b = await toUniversalNetlist(spec, new Date('2027-01-01T00:00:00.000Z'));
    expect(a.universalNetlistSchemaVersion).toBe(2);
    expect(a.metadata.origin).toEqual({ type: 'native' });
    expect(a.metadata.generatedAt).toBe('2026-10-27T10:00:00.123Z');
    expect(a.metadata.netlistHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(a.metadata.netlistHash).toBe(b.metadata.netlistHash);
    const other = await toUniversalNetlist(CIRCUIT_SCHEMATICS['radio']);
    expect(other.metadata.netlistHash).not.toBe(a.metadata.netlistHash);
  });
});

describe('wireLabel', () => {
  it('keeps just the gauge from the circuit text', () => {
    expect(wireLabel(CIRCUITS.find((c) => c.id === 'radiator-fan')!)).toBe('14–10 AWG');
    expect(wireLabel(CIRCUITS.find((c) => c.id === 'headlight-low')!)).toBe('12 AWG');
  });
});

// ---------------------------------------------------------------- page drawing
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('palettes', () => {
  it('keeps every kind of text readable on its paper (WCAG AA, 4.5:1)', () => {
    for (const [name, pal] of Object.entries(PALETTES)) {
      for (const key of ['text', 'label', 'note'] as const) {
        expect(contrast(pal[key], pal.paper)).withContext(`${name} ${key}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps the highlight and the wires clearly visible on the paper (3:1)', () => {
    for (const [name, pal] of Object.entries(PALETTES)) {
      expect(contrast(pal.accent, pal.paper)).withContext(`${name} accent`).toBeGreaterThanOrEqual(3);
      expect(contrast(pal.wire, pal.paper)).withContext(`${name} wire`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('branch captions', () => {
  const spec = (id: string) => CIRCUIT_SCHEMATICS[id];

  it('names columns by what they do', () => {
    expect(spec('horn').map(branchTitle)).toEqual(['Battery', 'Relay control', 'Relay power']);
    expect(spec('headlight-low').map(branchTitle)).toEqual(['Battery', 'Relay control', 'Relay power', 'Left low beam', 'Right low beam']);
    expect(branchTitle(spec('radio')[1])).toBe('Switched feed');
    expect(spec('charging-system').map(branchTitle)).toEqual(['Alternator', 'Fused feed', 'Battery']);
  });

  it('draws a caption above every branch', () => {
    const circuit = CIRCUITS.find((c) => c.id === 'turn-signals')!;
    const layout = layoutSchematic(spec(circuit.id), circuit);
    expect(layout.captions.length).toBe(spec(circuit.id).length);
    expect(layout.captions.every((c) => c.y < 50.8)).toBe(true);
    const scene = toSvgScene(layout, PALETTES.dark);
    expect(scene.texts.some((t) => t.text === 'BATTERY')).toBe(true);
    expect(scene.texts.some((t) => t.text === 'REAR LAMP R')).toBe(true);
  });
});

describe('part explanations', () => {
  const spec = CIRCUIT_SCHEMATICS['headlight-low'];

  it('lists what a fuse connects to', () => {
    const d = describePart(spec, 'F1')!;
    expect(d.name).toBe('Fuse');
    expect(d.links.map((l) => l.net)).toEqual(['+12V BATT', 'N3_1']);
    expect(d.links[0].others.map((o) => o.ref)).toContain('BT1');
    expect(d.links[1].others.map((o) => o.ref)).toEqual(['K1-1']);
  });

  it('pairs a relay coil with its contact and lights both branches', () => {
    const coil = describePart(spec, 'K1')!;
    expect(coil.partner?.ref).toBe('K1-1');
    const contactBranch = spec.findIndex((b) => b.parts.some((p) => p.ref === 'K1-1'));
    expect(coil.branches).toContain(contactBranch);
    expect(describePart(spec, 'K1-1')!.partner?.ref).toBe('K1');
  });

  it('lights lamps that share a net but never lights everything through GND', () => {
    const lamp = describePart(spec, 'LP1')!;
    const powerBranch = spec.findIndex((b) => b.bottom === 'LOW BEAM');
    expect(lamp.branches).toContain(powerBranch);
    expect(lamp.branches.length).toBeLessThan(spec.length);
    expect(describePart(spec, 'nope')).toBeUndefined();
  });

  it('dims branches that are not highlighted and marks the selected part', () => {
    const circuit = CIRCUITS.find((c) => c.id === 'headlight-low')!;
    const layout = layoutSchematic(spec, circuit);
    const scene = toSvgScene(layout, PALETTES.dark, { ref: 'F1', branches: [2] });
    expect(scene.hits.find((h) => h.ref === 'F1')!.selected).toBe(true);
    expect(scene.hits.find((h) => h.ref === 'LP1')!.selected).toBe(false);
    expect(scene.lines.some((l) => l.opacity < 1)).toBe(true);
    expect(toSvgScene(layout, PALETTES.dark).lines.every((l) => l.opacity === 1)).toBe(true);
  });
});

describe('legend', () => {
  it('lists only the symbols a circuit uses', () => {
    const radio = legendItems(CIRCUIT_SCHEMATICS['radio'], PALETTES.dark).map((i) => i.name);
    expect(radio).toEqual(['Battery', 'Switch', 'Fuse', 'Load', 'GND']);
    const big3 = legendItems(CIRCUIT_SCHEMATICS['big-3-upgrade'], PALETTES.dark).map((i) => i.name);
    expect(big3).toContain('Heavy cable');
    expect(big3).not.toContain('Relay coil');
  });
});

// ------------------------------------------------------------ golden outputs
// The downloads must not change when the page drawing changes. These hashes were taken before the
// redesign. If you change the file format on purpose, regenerate them.
// These 8 changed on purpose when the wire colours moved to the six the shop sells (the wire label in
// the file names the colour, e.g. ORANGE became RED). Only that word differs: the layout is the same.
const KICAD_FILE_HASH: Record<string, string> = {
  'main-feed': 'a44b8d6bcdfe59a9',
  'charging-system': 'bc87b956af0bb902',
  'big-3-upgrade': '6a47e350672ddaf7',
  'starter': '7c9f07cb297b65c7',
  'ignition-carbureted': '5a3dfa1d5d6bcebf',
  'fuel-pump': '5d1c784c3eb62304',
  'headlight-low': '194c599ceff27dfa',
  'headlight-high': '47d8b95ab0ae37ea',
  'led-accessory-power': '46e06cc4ece025f3',
  'tail-park': 'c637c88c0335761f',
  'brake-lights': 'f2f396e915745173',
  'turn-signals': '20289991bf26e033',
  'hazard-lights': '97c24f8273b69dfa',
  'horn': '26f2d70871ca6043',
  'radiator-fan': '5af26acde60ec315',
  '12v-socket': '1753e2a7eb2f95a6',
  'interior-lights': 'cc3f2ec7752bfb43',
  'wipers': 'bee6b21d736fac46',
  'radio': '61a3574f34899bc9',
  'amplifier': 'bea44ce7aaf8d851',
  'gauges': '0652f3770f64836a',
};
const NETLIST_HASH: Record<string, string> = {
  'main-feed': '958f8b79b381965a',
  'charging-system': '3150579a171cc5ea',
  'big-3-upgrade': 'f524c36866e2d135',
  'starter': 'd8584c4a1d3ebd66',
  'ignition-carbureted': '390338d1972a205b',
  'fuel-pump': 'd82cafabe99b6e7c',
  'headlight-low': 'e8581a60528334e5',
  'headlight-high': '85d75217ba817ef2',
  'led-accessory-power': '756cf57bded26880',
  'tail-park': '546c24a22ce441ac',
  'brake-lights': '1697bd96b31ce65b',
  'turn-signals': 'c2de6c3f84e54e17',
  'hazard-lights': '79c1898ae8bd6b03',
  'horn': 'ce8dda33b8d89c5a',
  'radiator-fan': '80162d6ba9eb28f6',
  '12v-socket': '46c2af625e083d20',
  'interior-lights': '3c6341bceb335086',
  'wipers': 'c547a73f92f99d48',
  'radio': 'a00097b2bf3b3d9b',
  'amplifier': '6813c43edc6137d7',
  'gauges': 'a03810d1c9b58e62',
};

const sha256 = async (text: string) => {
  const d = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

describe('downloads', () => {
  it('still produce byte-for-byte the same .kicad_sch for every circuit', async () => {
    for (const c of CIRCUITS) {
      const text = toKicadSch(layoutSchematic(CIRCUIT_SCHEMATICS[c.id], c), c, { date: '2026-10-27' });
      expect((await sha256(text)).slice(0, 16)).withContext(c.id).toBe(KICAD_FILE_HASH[c.id]);
    }
  });

  it('still produce the same netlist content for every circuit', async () => {
    for (const c of CIRCUITS) {
      const n = await toUniversalNetlist(CIRCUIT_SCHEMATICS[c.id], new Date('2026-10-27T00:00:00.000Z'));
      expect(n.metadata.netlistHash.slice(7, 23)).withContext(c.id).toBe(NETLIST_HASH[c.id]);
    }
  });
});
