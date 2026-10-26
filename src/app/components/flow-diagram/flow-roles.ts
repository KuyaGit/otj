// What a stage in an arrow diagram does, worked out from its label, so each box can say so
export type StageRole = 'source' | 'protection' | 'switch' | 'cable' | 'load' | 'ground';

export const ROLE_LABEL: Record<StageRole, string> = {
  source: 'Source',
  protection: 'Protection',
  switch: 'Switch',
  cable: 'Cable',
  load: 'Load',
  ground: 'Ground',
};

// First match wins. "Main battery cable" is a cable even though it says battery, so cable comes first.
const ROLE_RULES: [RegExp, StageRole][] = [
  [/ground|chassis|\(–\)|negative|engine block/i, 'ground'],
  [/cable|wire|awg/i, 'cable'],
  [/fuse/i, 'protection'],
  [/relay|flasher|switch/i, 'switch'],
  [/alternator|battery|\(\+\)|switched \+/i, 'source'],
];

export function roleFor(label: string): StageRole {
  return ROLE_RULES.find(([re]) => re.test(label))?.[1] ?? 'load';
}
