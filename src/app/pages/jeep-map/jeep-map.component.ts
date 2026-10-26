import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CATEGORIES, CIRCUITS, Circuit } from '../../data/wiring-data';
import { LEG_KIND_LABEL, MAP_NODES, MAP_ROUTES, NODE_KIND_LABEL, connectionsFor, wireColorFor } from '../../data/jeep-map';
import { wireImageFor } from '../../data/wire-images';
import { IconComponent } from '../../components/icon/icon.component';
import { JeepScene, PickResult, ViewName } from './jeep-scene';

@Component({
  selector: 'app-jeep-map',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './jeep-map.component.html',
  styleUrl: './jeep-map.component.css',
})
export class JeepMapComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private scene?: JeepScene;

  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;

  views: { id: ViewName; label: string }[] = [
    { id: 'front', label: 'Front' },
    { id: 'side', label: 'Side' },
    { id: 'top', label: 'Top' },
    { id: 'dash', label: 'Dash' },
  ];

  // circuits with no MAP_ROUTES entry still show in the list, with a "no 3D route yet" card
  groups = CATEGORIES.map((cat) => ({ cat, circuits: CIRCUITS.filter((c) => c.category === cat.id) })).filter(
    (g) => g.circuits.length,
  );

  selectedId = signal<string | null>(null);
  partId = signal<string | null>(null);
  showGround = signal(true);
  listOpen = signal(true);
  webglFailed = signal(false);

  selected = computed<Circuit | undefined>(() => CIRCUITS.find((c) => c.id === this.selectedId()));
  selectedLegs = computed(() =>
    (MAP_ROUTES[this.selectedId() ?? ''] ?? []).map((l) => ({
      from: MAP_NODES[l.from].label,
      to: MAP_NODES[l.to].label,
      kind: l.kind,
    })),
  );

  kindLabel = LEG_KIND_LABEL;

  // example photo for the selected circuit, if there is one
  image = computed(() => wireImageFor(this.selectedId() ?? ''));

  // The clicked part with every wire that touches it, grouped by circuit
  part = computed(() => {
    const id = this.partId();
    const node = id ? MAP_NODES[id] : undefined;
    if (!id || !node) return undefined;
    return {
      ...node,
      id,
      kindLabel: NODE_KIND_LABEL[node.kind],
      connections: connectionsFor(id).map((c) => ({ ...c, circuit: CIRCUITS.find((x) => x.id === c.circuitId)! })),
    };
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((q) => {
      const id = q.get('circuit');
      const part = q.get('part');
      if (part && MAP_NODES[part]) this.applyPart(part);
      if (id && CIRCUITS.some((c) => c.id === id)) this.applySelection(id);
    });
  }

  ngAfterViewInit(): void {
    try {
      this.scene = new JeepScene(this.host.nativeElement, (hit) => this.onPick(hit));
      this.scene.setSelection(this.selectedId());
      this.scene.setFocusNode(this.partId());
      this.scene.setShowGround(this.showGround());
    } catch {
      this.webglFailed.set(true);
    }
  }

  ngOnDestroy(): void {
    this.scene?.dispose();
  }

  hasRoute(id: string): boolean {
    return !!MAP_ROUTES[id]?.length;
  }

  color(id: string): string {
    return wireColorFor(id);
  }

  // From the circuit list: pick a circuit and drop any focused part
  select(id: string | null): void {
    this.applyPart(null);
    this.applySelection(id);
    this.syncUrl();
  }

  // From a connection row in the part card: show that circuit but keep the part open
  selectCircuit(id: string): void {
    this.applySelection(id);
    this.syncUrl();
  }

  selectPart(id: string | null, fly = true): void {
    this.applySelection(null);
    this.applyPart(id, fly);
    this.syncUrl();
  }

  private onPick(hit: PickResult): void {
    if ('nodeId' in hit) this.selectPart(hit.nodeId);
    else this.select(hit.circuitId);
  }

  private syncUrl(): void {
    this.router.navigate([], {
      queryParams: { circuit: this.selectedId(), part: this.partId() },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  toggleGround(): void {
    this.showGround.update((v) => !v);
    this.scene?.setShowGround(this.showGround());
  }

  setView(v: ViewName): void {
    this.scene?.setView(v);
  }

  private applyPart(id: string | null, fly = false): void {
    this.partId.set(id);
    this.scene?.setFocusNode(id, fly);
  }

  private applySelection(id: string | null): void {
    this.selectedId.set(id);
    this.scene?.setSelection(id && this.hasRoute(id) ? id : null);
  }
}
