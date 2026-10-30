import { CIRCUITS } from './wiring-data';
import { WIRE_IMAGES, wireImageFor } from './wire-images';
import { MAP_NODES, MAP_ROUTES, MAP_WAYPOINTS, WAYPOINT_LABELS, connectionsFor, legPoints, wireRadius } from './jeep-map';

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

describe('part details', () => {
  it('describes every part and labels every waypoint', () => {
    for (const [id, n] of Object.entries(MAP_NODES)) expect(n.desc.length).withContext(id).toBeGreaterThan(20);
    for (const id of Object.keys(MAP_WAYPOINTS)) expect(WAYPOINT_LABELS[id]).withContext(id).toBeTruthy();
  });

  it('uses every part in at least one route', () => {
    const used = new Set(Object.values(MAP_ROUTES).flatMap((legs) => legs.flatMap((l) => [l.from, l.to])));
    expect(Object.keys(MAP_NODES).filter((id) => !used.has(id))).toEqual([]);
  });

  it('lists the circuits that touch a part, in guide order', () => {
    const ids = connectionsFor('battery').map((c) => c.circuitId);
    expect(ids).toContain('main-feed');
    expect(ids).toContain('starter');
    expect(ids.indexOf('main-feed')).toBeLessThan(ids.indexOf('starter'));
  });

  it('says which way each wire runs and how', () => {
    const starter = connectionsFor('starter').find((c) => c.circuitId === 'starter')!;
    const fromBattery = starter.links.find((l) => l.otherId === 'battery')!;
    expect(fromBattery.direction).toBe('in');
    const fuel = connectionsFor('fuelPump').find((c) => c.circuitId === 'fuel-pump')!;
    const feed = fuel.links.find((l) => l.kind === 'switched')!;
    expect(feed.direction).toBe('in');
    expect(feed.route.split(' → ')[0]).toBe(WAYPOINT_LABELS['railRearMid']);   // starts at the pump end
  });

  it('draws ground wires black and names the circuit colour for the rest', () => {
    const horn = connectionsFor('horn').find((c) => c.circuitId === 'horn')!;
    expect(horn.links.find((l) => l.kind === 'ground')!.colorName).toBe('Black');
    expect(horn.links.find((l) => l.kind === 'feed')!.colorName).toBe('Red');
  });

  it('returns nothing for an unknown part', () => {
    expect(connectionsFor('nope')).toEqual([]);
  });
});

describe('wire images', () => {
  it('gives every photo the credit its licence needs', () => {
    for (const [key, img] of Object.entries(WIRE_IMAGES)) {
      expect(img.author).withContext(key).toBeTruthy();
      expect(img.license).withContext(key).toBeTruthy();
      expect(img.source.startsWith('https://commons.wikimedia.org/wiki/File:')).withContext(key).toBe(true);
      expect(img.file.endsWith('.jpg')).withContext(key).toBe(true);
      // CC BY and CC BY-SA need a licence link; only CC0 and public domain may leave it out
      if (/^CC BY/.test(img.license)) expect(img.licenseUrl).withContext(key).toContain('creativecommons.org');
    }
  });

  it('has a photo for every circuit', () => {
    expect(CIRCUITS.filter((c) => !wireImageFor(c.id)).map((c) => c.id)).toEqual([]);
  });

  it('shares one bulb photo between low and high beam', () => {
    expect(wireImageFor('headlight-low')).toBe(wireImageFor('headlight-high'));
  });

  it('returns nothing for an unknown circuit', () => {
    expect(wireImageFor('nope')).toBeUndefined();
  });
});
