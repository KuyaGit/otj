import { Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Circuit } from '../../data/wiring-data';
import { CIRCUIT_SCHEMATICS, SchBranch } from '../../data/circuit-schematics';
import {
  LegendItem, Layout, PALETTES, PaperId, PartDescription, PartLink, SvgScene,
  describePart, layoutSchematic, legendItems, toKicadSch, toSvgScene, toUniversalNetlist,
} from '../../schematics/schematic';

const PAPER_KEY = 'jeep-schematic-paper';
const PX_PER_MM = 4;                       // baseline size; small screens scroll sideways rather than shrink the text
const ZOOMS = [0.75, 1, 1.5, 2, 3];

// KiCad-style schematic of one circuit: dark or KiCad paper, click a part to see what it does, a legend,
// zoom and full screen, and downloads of the same drawing as a .kicad_sch and a Universal Netlist.
@Component({
  selector: 'app-schematic',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schematic.component.html',
  styleUrl: './schematic.component.css',
})
export class SchematicComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) circuit!: Circuit;
  @ViewChild('expandBtn') expandBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('closeBtn') closeBtn?: ElementRef<HTMLButtonElement>;

  paper: PaperId = readPaper();
  zoomIndex = 1;
  expanded = false;
  scene?: SvgScene;
  printScene?: SvgScene;
  legend: LegendItem[] = [];
  selection?: PartDescription;

  private spec?: SchBranch[];
  private layout?: Layout;

  ngOnChanges(): void {
    this.spec = CIRCUIT_SCHEMATICS[this.circuit.id];
    this.layout = this.spec && layoutSchematic(this.spec, this.circuit);
    this.selection = undefined;
    this.zoomIndex = 1;
    this.refresh();
  }

  ngOnDestroy(): void {
    this.lockScroll(false);
  }

  get minWidth(): number {
    return this.scene ? this.scene.width * PX_PER_MM * ZOOMS[this.zoomIndex] : 0;
  }

  get canZoomIn(): boolean { return this.zoomIndex < ZOOMS.length - 1; }
  get canZoomOut(): boolean { return this.zoomIndex > 0; }

  setPaper(paper: PaperId): void {
    this.paper = paper;
    try { localStorage.setItem(PAPER_KEY, paper); } catch { /* private mode: the choice just isn't remembered */ }
    this.refresh();
  }

  zoom(step: number): void {
    this.zoomIndex = Math.min(ZOOMS.length - 1, Math.max(0, this.zoomIndex + step));
  }

  select(ref: string, event?: Event): void {
    event?.stopPropagation();
    this.selection = this.selection?.ref === ref || !this.spec ? undefined : describePart(this.spec, ref);
    this.refresh();
  }

  clear(): void {
    if (!this.selection) return;
    this.selection = undefined;
    this.refresh();
  }

  expand(): void {
    this.expanded = true;
    this.lockScroll(true);
    setTimeout(() => this.closeBtn?.nativeElement.focus());
  }

  @HostListener('document:keydown.escape')
  close(): void {
    if (!this.expanded) return;
    this.expanded = false;
    this.lockScroll(false);
    setTimeout(() => this.expandBtn?.nativeElement.focus());
  }

  // "In" is the power side of a part (its top pin), "Out" the return side. A wire straight to the next
  // part has only an internal name, so it is described by the part it reaches instead.
  describe(link: PartLink): string {
    const lead = link.side === 'top' ? 'In from ' : 'Out to ';
    const parts = link.others.map((o) => `${o.ref} ${o.value}`).join(', ');
    if (/^N\d+_\d+$/.test(link.net)) return lead + (parts || 'the next part');
    const where = link.net === 'GND' ? 'GND (chassis, back to the battery negative)' : link.net;
    return lead + where + (parts ? `, shared with ${parts}` : '');
  }

  downloadKicad(): void {
    if (!this.layout) return;
    this.save(toKicadSch(this.layout, this.circuit), `${this.circuit.id}.kicad_sch`, 'text/plain');
  }

  async downloadNetlist(): Promise<void> {
    if (!this.spec) return;
    const netlist = await toUniversalNetlist(this.spec);
    this.save(JSON.stringify(netlist, null, 2) + '\n', `${this.circuit.id}.netlist.json`, 'application/json');
  }

  private refresh(): void {
    if (!this.layout || !this.spec) {
      this.scene = this.printScene = undefined;
      this.legend = [];
      return;
    }
    const highlight = this.selection ? { ref: this.selection.ref, branches: this.selection.branches } : null;
    this.scene = toSvgScene(this.layout, PALETTES[this.paper], highlight);
    this.printScene = toSvgScene(this.layout, PALETTES.kicad);   // a printout is always on light paper
    this.legend = legendItems(this.spec, PALETTES[this.paper]);
  }

  private lockScroll(lock: boolean): void {
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  private save(text: string, name: string, type: string): void {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function readPaper(): PaperId {
  try {
    return localStorage.getItem(PAPER_KEY) === 'kicad' ? 'kicad' : 'dark';
  } catch {
    return 'dark';
  }
}
