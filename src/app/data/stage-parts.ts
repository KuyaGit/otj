import { Circuit, CircuitStage } from './wiring-data';

// The part to buy for a box in the arrow diagram, worked out from its label so the diagram data
// needs no extra field. Boxes with no part to buy (battery, lamps, a switch you already have) give
// undefined. These names match the rows in data/shopping-list.ts.
export const PART = {
  relay: '12V 40A 5-pin relay + socket',
  relays: '12V 40A 5-pin relay + socket, one per circuit',
  flasher: '3-pin electronic flasher, LED-compatible',
  hazardSwitch: 'Multi-pole hazard switch',
  turnSwitch: 'Turn signal switch (column lever)',
  fuseBlock: '16-way blade fuse block',
  fuses: 'Blade fuses, one per circuit',
  mainFuse: '60–100A main fuse + holder',
  fusibleLink: 'Fusible link or maxi fuse + holder',
};

// "20A", "10–15A" and "7.5–20A" all give their size
const FUSE_SIZE = /(\d+(?:\.\d+)?(?:\s*[–-]\s*\d+(?:\.\d+)?)?)\s*A\b/;

function fuseSize(stage: CircuitStage, circuit: Circuit): string | undefined {
  for (const text of [stage.label, stage.sub ?? '', circuit.fuse]) {
    const m = text.match(FUSE_SIZE);
    if (m) return m[1].replace(/\s+/g, '') + 'A';
  }
  return undefined;
}

export function partFor(stage: CircuitStage, circuit: Circuit): string | undefined {
  const label = stage.label.toLowerCase();
  if (/panel/.test(label)) return PART.fuseBlock;
  if (/fusible link/.test(label)) return PART.fusibleLink;
  if (/^main fuse/.test(label)) return PART.mainFuse;
  if (/fused circuits/.test(label)) return PART.fuses;
  if (/fuse/.test(label)) {
    const size = fuseSize(stage, circuit);
    return size ? `${size} blade fuse` : 'Blade fuse, sized per the circuit';
  }
  if (/flasher/.test(label)) return PART.flasher;
  if (/^relays/.test(label)) return PART.relays;
  if (/relay/.test(label)) return PART.relay;
  if (/^hazard switch/.test(label)) return PART.hazardSwitch;
  if (/^turn signal switch/.test(label)) return PART.turnSwitch;
  return undefined;
}

// One entry per box in circuit.diagram, in the same order
export function partsFor(circuit: Circuit): (string | undefined)[] {
  return circuit.diagram.map((stage) => partFor(stage, circuit));
}
