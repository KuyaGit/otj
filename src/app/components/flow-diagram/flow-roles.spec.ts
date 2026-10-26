import { CIRCUITS } from '../../data/wiring-data';
import { roleFor } from './flow-roles';

describe('roleFor', () => {
  it('names what a stage does', () => {
    expect(roleFor('Battery (+)')).toBe('source');
    expect(roleFor('Alternator B+')).toBe('source');
    expect(roleFor('20A fuse')).toBe('protection');
    expect(roleFor('Low-beam relay')).toBe('switch');
    expect(roleFor('Turn signal switch')).toBe('switch');
    expect(roleFor('Low beam lamps')).toBe('load');
    expect(roleFor('Battery (–)')).toBe('ground');
    expect(roleFor('Engine block')).toBe('ground');
  });

  it('treats a battery cable as a cable, not a source', () => {
    expect(roleFor('Main battery cable')).toBe('cable');
    expect(roleFor('New charge cable')).toBe('cable');
  });

  it('gives every stage in the guide a role', () => {
    const labels = CIRCUITS.flatMap((c) => [...c.diagram, ...(c.groundDiagram ?? [])].map((s) => s.label));
    expect(labels.length).toBeGreaterThan(40);
    for (const label of labels) expect(roleFor(label)).withContext(label).toBeTruthy();
  });
});
