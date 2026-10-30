import { CIRCUITS, WIRE_COLORS } from './wiring-data';
import { FLASHER_COUNT, RELAY_COUNT, SHOPPING, SHOP_WIRE_COLORS, SPARE_RELAYS, colorTotals, wirePacks } from './shopping-list';

describe('shopping list', () => {
  const items = SHOPPING.flatMap((s) => s.items);
  const item = (id: string) => items.find((i) => i.id === id)!;

  it('gives every item a unique id, a name and a quantity', () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const i of items) {
      expect(i.name.length).withContext(i.id).toBeGreaterThan(0);
      expect(i.qty.length).withContext(i.id).toBeGreaterThan(0);
    }
  });

  it('has items in every section', () => {
    for (const s of SHOPPING) expect(s.items.length).withContext(s.id).toBeGreaterThan(0);
  });

  it('buys one relay per relay circuit, plus spares, and one flasher per flasher circuit', () => {
    expect(RELAY_COUNT).toBe(CIRCUITS.filter((c) => c.relay).length);
    expect(item('relay-40a').qty).toBe(String(RELAY_COUNT + SPARE_RELAYS));
    expect(item('relay-socket').qty).toBe(String(RELAY_COUNT));
    expect(item('flasher-3pin').qty).toBe(String(FLASHER_COUNT));
  });

  it('has wire for every gauge the relay and flasher tables use', () => {
    const gauges = new Set<string>();
    for (const c of CIRCUITS) {
      for (const p of [...(c.relay?.pins ?? []), ...(c.flasher?.pins ?? [])]) {
        // "16–18 AWG" and "14 AWG" both give their gauge numbers; a range gives both ends
        for (const seg of p.wire.match(/\d+(?:\s*[–-]\s*\d+)?\s*AWG/g) ?? []) {
          for (const n of seg.match(/\d+/g) ?? []) gauges.add(n);
        }
      }
    }
    const bought = new Set(items.filter((i) => i.id.startsWith('wire-')).map((i) => i.id.split('-')[1]));
    expect([...gauges].filter((g) => !bought.has(g))).toEqual([]);
  });

  describe('wire rows', () => {
    const wires = items.filter((i) => i.id.startsWith('wire-'));

    it('has one row per size and colour, named and grouped by its size', () => {
      expect(new Set(wires.map((w) => w.id)).size).toBe(wires.length);
      for (const w of wires) {
        const [, gauge, color] = w.id.split('-');
        expect(w.group).withContext(w.id).toBe(`${gauge} AWG`);
        expect(w.name.toLowerCase()).withContext(w.id).toBe(`${gauge} awg wire, ${color}`);
        expect(w.qty).withContext(w.id).toMatch(/^\d+(\.\d+)? m$/);
      }
    });

    it('only uses colours from the guide wire legend', () => {
      const legend = WIRE_COLORS.map((c) => c.color);
      for (const w of wires) expect(legend).withContext(w.id).toContain(w.color!);
    });

    it('keeps each size together so its heading appears once', () => {
      const order = wires.map((w) => w.group!);
      const collapsed = order.filter((g, i) => g !== order[i - 1]);
      expect(new Set(collapsed).size).toBe(collapsed.length);
    });

    it('only uses colours the shop sells, which are all in the guide legend', () => {
      for (const w of wires) expect(SHOP_WIRE_COLORS).withContext(w.id).toContain(w.color!);
      const legend = WIRE_COLORS.map((c) => c.color);
      for (const c of SHOP_WIRE_COLORS) expect(legend).withContext(c).toContain(c);
    });

    it('rounds every row up to whole 5 m and 10 m packs', () => {
      for (const w of wires) expect(parseFloat(w.qty) % 5).withContext(w.id).toBe(0);
    });

    it('totals each colour across every size, leaving out optional wire', () => {
      const totals = colorTotals();
      const metres = (c: string) => totals.find((t) => t.color === c)?.meters;
      expect(metres('Red')).toBe(10 + 10);
      expect(metres('Black')).toBe(5 + 5 + 5);   // short local grounds, one 5 m pack per size
      expect(metres('Yellow')).toBe(10);
      expect(metres('Orange')).toBeUndefined();   // the shop has no orange
      const required = wires.filter((w) => !w.optional).reduce((n, w) => n + parseFloat(w.qty), 0);
      expect(totals.reduce((n, t) => n + t.meters, 0)).toBe(required);
    });
  });

  describe('wirePacks', () => {
    it('uses the fewest 10 m and 5 m packs that cover the length', () => {
      expect(wirePacks(3)).toEqual({ total: 5, text: '1 × 5 m' });
      expect(wirePacks(5)).toEqual({ total: 5, text: '1 × 5 m' });
      expect(wirePacks(6)).toEqual({ total: 10, text: '1 × 10 m' });
      expect(wirePacks(10)).toEqual({ total: 10, text: '1 × 10 m' });
      expect(wirePacks(13)).toEqual({ total: 15, text: '1 × 10 m + 1 × 5 m' });
      expect(wirePacks(16)).toEqual({ total: 20, text: '2 × 10 m' });
      expect(wirePacks(20)).toEqual({ total: 20, text: '2 × 10 m' });
    });
  });
});
