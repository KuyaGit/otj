// Exports every circuit as a Universal Netlist, then loads and electrically checks each one with the
// @intelligentelectron/universal-netlist package. Run with: npm run check:netlists
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isErrorResult, loadNetlist, runErc } from '@intelligentelectron/universal-netlist/service';
import { CIRCUITS } from '../src/app/data/wiring-data';
import { CIRCUIT_SCHEMATICS } from '../src/app/data/circuit-schematics';
import { toUniversalNetlist } from '../src/app/schematics/schematic';

const dir = mkdtempSync(join(tmpdir(), 'jeep-netlists-'));
let failed = 0;
let warned = 0;

for (const circuit of CIRCUITS) {
  const spec = CIRCUIT_SCHEMATICS[circuit.id];
  if (!spec) {
    console.log(`FAIL ${circuit.id}: no schematic`);
    failed++;
    continue;
  }
  const file = join(dir, `${circuit.id}.netlist.json`);
  writeFileSync(file, JSON.stringify(await toUniversalNetlist(spec), null, 2) + '\n');

  const loaded = await loadNetlist(file);
  if (isErrorResult(loaded)) {
    console.log(`FAIL ${circuit.id}: ${JSON.stringify(loaded)}`);
    failed++;
    continue;
  }
  const erc = await runErc(file);
  if (isErrorResult(erc)) {
    console.log(`FAIL ${circuit.id}: ${JSON.stringify(erc)}`);
    failed++;
    continue;
  }
  const errors = erc.errors ?? {};
  const warnings = erc.warnings ?? {};
  const nE = Object.keys(errors).length;
  const nW = Object.keys(warnings).length;
  console.log(`${nE ? 'FAIL' : nW ? 'warn' : 'ok  '} ${circuit.id}  (${Object.keys(loaded.components).length} parts, ${Object.keys(loaded.nets).length} nets, checked: ${erc.checked.join(', ') || 'none'})`);
  if (nE) { console.log('  errors:', JSON.stringify(errors)); failed++; }
  if (nW) { console.log('  warnings:', JSON.stringify(warnings)); warned++; }
}

console.log(`\n${CIRCUITS.length} circuits: ${failed} failed, ${warned} with warnings`);
process.exit(failed ? 1 : 0);
