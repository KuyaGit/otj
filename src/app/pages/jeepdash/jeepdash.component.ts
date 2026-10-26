import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { PHASES } from '../../data/jeepdash-phases';
import { IconComponent } from '../../components/icon/icon.component';

// Step ids are `${phase.id}-${index}`, so any change to the step list needs a new key.
// v2 is the 7" touch board rewrite; v1 data is migrated once on load (the v1 key is left untouched).
const KEY = 'jeepdash-guide-v2';
const LEGACY_KEY = 'jeepdash-guide-v1';
const BACKUP_VERSION = 2;

// Phases whose steps still mean the same thing in v2, so their v1 checkmarks carry over.
// partlist, bench, power, rpm, install and alarms were rewritten for the new board.
const KEEP_FROM_V1 = ['coolant', 'oil', 'batt', 'cal'];

interface Cal {
  vref: string;
  r25: string;
  beta: string;
  oilmax: string;
  fuelEmptyRaw: string;
  fuelFullRaw: string;
}

interface State {
  checked: Record<string, true>;
  notes: Record<string, string>;
  cal: Cal;
}

const DEFAULT_CAL: Cal = { vref: '3.30', r25: '10000', beta: '3950', oilmax: '100', fuelEmptyRaw: '', fuelFullRaw: '' };

// 100k/22k divider: converts the ADC reading back to sender-wire voltage
const FUEL_DIVIDER = (100 + 22) / 22;

const PAGE_DESCRIPTION =
  'Step-by-step build checklist for an ESP32 digital dash on a Toyota 4K owner-type jeep: parts, wiring, calibration and alarm testing, saved in your browser.';

function emptyState(): State {
  return { checked: {}, notes: {}, cal: { ...DEFAULT_CAL } };
}

function normalize(s: Partial<State>): State {
  return { checked: s.checked || {}, notes: s.notes || {}, cal: { ...DEFAULT_CAL, ...(s.cal || {}) } };
}

// v1 notes and calibration values stay valid (phase ids did not change); only checkmarks for
// rewritten phases are dropped.
function migrateV1(s: Partial<State>): { state: State; cleared: number } {
  const state = normalize(s);
  let cleared = 0;
  const checked: Record<string, true> = {};
  for (const id of Object.keys(state.checked)) {
    if (KEEP_FROM_V1.includes(id.split('-')[0])) checked[id] = true;
    else cleared++;
  }
  return { state: { ...state, checked }, cleared };
}

function migrationNotice(cleared: number): string {
  return cleared
    ? `Imported from the 3.5" build. ${cleared} checkmark${cleared === 1 ? '' : 's'} cleared because those steps changed for the 7" touch board. Notes and calibration values were kept.`
    : 'Imported from the 3.5" build. Notes and calibration values were kept.';
}

function num(v: string, fallback: number): number {
  const n = parseFloat(v);
  return isFinite(n) ? n : fallback;
}

@Component({
  selector: 'app-jeepdash',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './jeepdash.component.html',
  styleUrl: './jeepdash.component.css',
})
export class JeepdashComponent implements OnInit, OnDestroy {
  private title = inject(Title);
  private meta = inject(Meta);

  @ViewChild('snippetEl') snippetEl!: ElementRef<HTMLElement>;
  @ViewChild('importEl') importEl!: ElementRef<HTMLTextAreaElement>;

  phases = PHASES;

  calFields: { key: keyof Cal; id: string; label: string; step: string; hint: string }[] = [
    { key: 'vref', id: 'c-vref', label: '3.3V rail (multimeter)', step: '0.01', hint: 'Measured at the 3V3 pin on the board I2C header. Default 3.30' },
    { key: 'r25', id: 'c-r25', label: 'Coolant sensor R at 25 °C (Ω)', step: '1', hint: 'From the sensor listing or datasheet. Default 10000' },
    { key: 'beta', id: 'c-beta', label: 'Coolant sensor beta', step: '1', hint: 'Default 3950' },
    { key: 'oilmax', id: 'c-oil', label: 'Oil sensor max psi', step: '1', hint: '100 for a 0–100 psi sensor' },
    { key: 'fuelEmptyRaw', id: 'c-fe', label: 'Fuel: raw a3 at empty (V)', step: '0.001', hint: 'Serial value, near-empty tank' },
    { key: 'fuelFullRaw', id: 'c-ff', label: 'Fuel: raw a3 at full (V)', step: '0.001', hint: 'Serial value, right after filling up' },
  ];

  state = signal<State>(emptyState());
  savedMsg = signal('Saved on this device');
  snippetMsg = signal('');
  importMsg = signal('');
  migrationMsg = signal('');
  importText = signal('');
  showImport = signal(false);
  confirmReset = signal(false);

  progress = computed(() => {
    const checked = this.state().checked;
    const perPhase: Record<string, { done: number; total: number }> = {};
    let total = 0;
    let done = 0;
    for (const p of this.phases) {
      const entry = { done: 0, total: 0 };
      p.steps.forEach((s, j) => {
        if (this.isGroup(s)) return;
        entry.total++;
        if (checked[this.stepId(p.id, j)]) entry.done++;
      });
      perPhase[p.id] = entry;
      total += entry.total;
      done += entry.done;
    }
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0, perPhase };
  });

  snippet = computed(() => {
    const c = this.state().cal;
    const fe = num(c.fuelEmptyRaw, NaN);
    const ff = num(c.fuelFullRaw, NaN);
    const feTxt = isFinite(fe) ? (fe * FUEL_DIVIDER).toFixed(2) + 'f' : '7.0f';
    const ffTxt = isFinite(ff) ? (ff * FUEL_DIVIDER).toFixed(2) + 'f' : '1.0f';
    return `constexpr float NTC_VREF   = ${num(c.vref, 3.3).toFixed(2)}f;
constexpr float NTC_R25    = ${num(c.r25, 10000).toFixed(1)}f;
constexpr float NTC_BETA   = ${num(c.beta, 3950).toFixed(1)}f;
constexpr float OIL_PSI_MAX = ${num(c.oilmax, 100).toFixed(1)}f;
constexpr float FUEL_V_EMPTY = ${feTxt};${isFinite(fe) ? '' : '   // not measured yet'}
constexpr float FUEL_V_FULL  = ${ffTxt};${isFinite(ff) ? '' : '   // not measured yet'}`;
  });

  private previousTitle = '';
  private saveTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.previousTitle = this.title.getTitle();
    this.title.setTitle('JeepDash Build Log');
    this.meta.updateTag({ name: 'description', content: PAGE_DESCRIPTION });
    this.load();
  }

  ngOnDestroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.save();
    }
    this.title.setTitle(this.previousTitle);
    this.meta.removeTag('name="description"');
  }

  isGroup(step: string): boolean {
    return step.startsWith('§');
  }

  stepId(phaseId: string, index: number): string {
    return `${phaseId}-${index}`;
  }

  isChecked(id: string): boolean {
    return !!this.state().checked[id];
  }

  toggleStep(id: string, on: boolean): void {
    this.state.update((s) => {
      const checked = { ...s.checked };
      if (on) checked[id] = true;
      else delete checked[id];
      return { ...s, checked };
    });
    this.save();
  }

  setNote(id: string, value: string): void {
    this.state.update((s) => ({ ...s, notes: { ...s.notes, [id]: value } }));
    this.saveSoon();
  }

  setCal(key: keyof Cal, value: string): void {
    this.state.update((s) => ({ ...s, cal: { ...s.cal, [key]: value } }));
    this.saveSoon();
  }

  async copySnippet(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.snippet());
      this.snippetMsg.set('Copied');
    } catch {
      const range = document.createRange();
      range.selectNodeContents(this.snippetEl.nativeElement);
      const sel = getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      this.snippetMsg.set('Clipboard blocked. The code is selected, copy it manually.');
    }
  }

  async copyBackup(): Promise<void> {
    const text = JSON.stringify({ v: BACKUP_VERSION, ...this.state() });
    try {
      await navigator.clipboard.writeText(text);
      this.savedMsg.set('Backup copied. Paste it somewhere safe.');
    } catch {
      this.showImport.set(true);
      this.importText.set(text);
      setTimeout(() => {
        this.importEl.nativeElement.focus();
        this.importEl.nativeElement.select();
      });
      this.savedMsg.set('Clipboard blocked. The text is selected in the box, copy it manually.');
    }
  }

  toggleImport(): void {
    this.showImport.update((v) => !v);
    this.importMsg.set('');
  }

  restore(): void {
    try {
      const s = JSON.parse(this.importText());
      if (typeof s !== 'object' || !s || !('checked' in s)) throw new Error('not a backup');
      if (s.v === BACKUP_VERSION) {
        this.state.set(normalize(s));
        this.migrationMsg.set('');
      } else {
        const m = migrateV1(s);
        this.state.set(m.state);
        this.migrationMsg.set(migrationNotice(m.cleared));
      }
      this.save();
      this.importMsg.set('Backup restored');
      this.importText.set('');
    } catch {
      this.importMsg.set("That isn't a JeepDash backup. Paste the full text from Copy backup.");
    }
  }

  reset(): void {
    this.state.set(emptyState());
    this.migrationMsg.set('');
    this.save();
    this.confirmReset.set(false);
  }

  // Step text is inline HTML containing "#calibration"; with a <base href> a bare fragment link
  // would leave the page, so scroll to the target instead of following it.
  onContentClick(e: Event): void {
    const link = (e.target as HTMLElement).closest('a[href^="#"]');
    if (!link) return;
    e.preventDefault();
    document.getElementById(link.getAttribute('href')!.slice(1))?.scrollIntoView();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        this.state.set(normalize(JSON.parse(raw)));
        return;
      }
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const m = migrateV1(JSON.parse(legacy));
        this.state.set(m.state);
        this.migrationMsg.set(migrationNotice(m.cleared));
        this.save();
      }
    } catch {
      // unreadable storage or corrupt JSON: start empty
    }
  }

  private save(): void {
    this.saveTimer = undefined;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state()));
      this.savedMsg.set(
        'Saved on this device · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      );
    } catch {
      this.savedMsg.set("This browser isn't saving. Use Copy backup to keep your progress.");
    }
  }

  private saveSoon(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 300);
  }
}
