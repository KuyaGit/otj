import { CIRCUITS } from './wiring-data';
import { CIRCUIT_SCHEMATICS } from './circuit-schematics';

// A circuit's flasher pin table and its schematic must agree on whether it has a flasher at all
describe('flasher wiring', () => {
  const hasFlasherInSchematic = (id: string) =>
    CIRCUIT_SCHEMATICS[id].some((branch) => branch.parts.some((part) => /flasher/i.test(part.value)));

  it('has a pin table for every circuit whose schematic has a flasher, and for no other', () => {
    const mismatched = CIRCUITS.filter((c) => !!c.flasher !== hasFlasherInSchematic(c.id)).map((c) => c.id);
    expect(mismatched).toEqual([]);
  });

  it('lists pins 49, 49a and 31 once each', () => {
    for (const c of CIRCUITS.filter((x) => x.flasher)) {
      expect(c.flasher!.pins.map((p) => p.pin)).withContext(c.id).toEqual(['49', '49a', '31']);
    }
  });

  it('puts the ground on 31 and fills in every cell', () => {
    for (const c of CIRCUITS.filter((x) => x.flasher)) {
      const pins = c.flasher!.pins;
      expect(pins.find((p) => p.pin === '31')!.connect).withContext(c.id).toMatch(/ground/i);
      for (const p of pins) {
        for (const cell of [p.role, p.connect, p.wire, p.fuse]) expect(cell.length).withContext(`${c.id} ${p.pin}`).toBeGreaterThan(0);
      }
    }
  });
});
