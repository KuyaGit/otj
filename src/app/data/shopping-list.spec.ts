import { CIRCUITS } from './wiring-data';
import { FLASHER_COUNT, RELAY_COUNT, SHOPPING, SPARE_RELAYS } from './shopping-list';

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
    const bought = new Set(items.filter((i) => i.id.startsWith('wire-')).map((i) => i.id.slice(5)));
    expect([...gauges].filter((g) => !bought.has(g))).toEqual([]);
  });
});
