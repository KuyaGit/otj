import { CIRCUITS } from './wiring-data';
import { CIRCUIT_SCHEMATICS } from './circuit-schematics';

// A circuit's relay pin table and its schematic must agree on whether it has a relay at all
describe('relay wiring', () => {
  const hasRelayInSchematic = (id: string) =>
    CIRCUIT_SCHEMATICS[id].some((branch) => branch.parts.some((part) => part.kind === 'relayCoil'));

  it('has a pin table for every circuit whose schematic has a relay, and for no other', () => {
    const mismatched = CIRCUITS.filter((c) => !!c.relay !== hasRelayInSchematic(c.id)).map((c) => c.id);
    expect(mismatched).toEqual([]);
  });

  it('lists pins 30, 87, 87a, 86 and 85 once each', () => {
    for (const c of CIRCUITS.filter((x) => x.relay)) {
      expect(c.relay!.pins.map((p) => p.pin)).withContext(c.id).toEqual(['30', '87', '87a', '86', '85']);
    }
  });

  it('follows DIN 72552: 85 is coil negative to ground, 86 is coil positive from the switch', () => {
    for (const c of CIRCUITS.filter((x) => x.relay)) {
      const pin = (n: string) => c.relay!.pins.find((p) => p.pin === n)!;
      expect(pin('85').role).withContext(c.id).toContain('negative');
      expect(pin('85').connect).withContext(c.id).toMatch(/ground/i);
      expect(pin('86').role).withContext(c.id).toContain('positive');
      expect(pin('86').connect).withContext(c.id).not.toMatch(/ground/i);
    }
  });

  it('leaves 87a unused, since every relay circuit here is normally open', () => {
    for (const c of CIRCUITS.filter((x) => x.relay)) {
      expect(c.relay!.pins.find((p) => p.pin === '87a')!.connect).withContext(c.id).toMatch(/not used/i);
    }
  });

  it('fills in every cell of every row', () => {
    for (const c of CIRCUITS.filter((x) => x.relay)) {
      for (const p of c.relay!.pins) {
        for (const cell of [p.role, p.connect, p.wire, p.fuse]) expect(cell.length).withContext(`${c.id} ${p.pin}`).toBeGreaterThan(0);
      }
    }
  });
});
