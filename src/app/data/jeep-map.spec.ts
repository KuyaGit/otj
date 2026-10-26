import { CIRCUITS } from './wiring-data';
import { MAP_NODES, MAP_ROUTES, MAP_WAYPOINTS, legPoints, wireRadius } from './jeep-map';

describe('jeep-map data', () => {
  it('has a 3D route for every circuit', () => {
    const missing = CIRCUITS.filter((c) => !MAP_ROUTES[c.id]?.length).map((c) => c.id);
    expect(missing).toEqual([]);
  });

  it('has no route for a circuit that does not exist', () => {
    const ids = CIRCUITS.map((c) => c.id);
    expect(Object.keys(MAP_ROUTES).filter((id) => !ids.includes(id))).toEqual([]);
  });

  it('only references nodes and waypoints that exist', () => {
    const bad: string[] = [];
    for (const [id, legs] of Object.entries(MAP_ROUTES)) {
      for (const leg of legs) {
        if (!MAP_NODES[leg.from]) bad.push(`${id}: node ${leg.from}`);
        if (!MAP_NODES[leg.to]) bad.push(`${id}: node ${leg.to}`);
        for (const w of leg.via ?? []) if (!MAP_WAYPOINTS[w]) bad.push(`${id}: waypoint ${w}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('gives every leg at least two distinct points', () => {
    for (const legs of Object.values(MAP_ROUTES)) {
      for (const leg of legs) {
        const pts = legPoints(leg);
        expect(pts.length).toBeGreaterThanOrEqual(2);
        expect(leg.from).not.toBe(leg.to);
      }
    }
  });

  it('keeps every node inside the Jeep envelope (3.6 m x 1.5 m x 1.8 m)', () => {
    for (const n of [...Object.values(MAP_NODES), ...Object.values(MAP_WAYPOINTS).map((pos) => ({ pos }))]) {
      const [x, y, z] = n.pos;
      expect(Math.abs(x)).toBeLessThanOrEqual(0.8);
      expect(y).toBeGreaterThanOrEqual(0.3);
      expect(y).toBeLessThanOrEqual(1.8);
      expect(Math.abs(z)).toBeLessThanOrEqual(1.9);
    }
  });
});

describe('wireRadius', () => {
  it('makes thicker wire (lower AWG) a thicker tube', () => {
    expect(wireRadius('4 AWG')).toBeGreaterThan(wireRadius('12 AWG'));
    expect(wireRadius('12 AWG')).toBeGreaterThan(wireRadius('18 AWG'));
  });

  it('uses the thickest gauge in a range', () => {
    expect(wireRadius('14–10 AWG (by fan current)')).toBe(wireRadius('10 AWG'));
    expect(wireRadius('16-12 AWG')).toBe(wireRadius('12 AWG'));
  });

  it('falls back to 16 AWG when there is no gauge in the text', () => {
    expect(wireRadius('see breakdown')).toBe(wireRadius('16 AWG'));
  });
});
