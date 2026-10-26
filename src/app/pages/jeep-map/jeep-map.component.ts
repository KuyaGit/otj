import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CATEGORIES, CIRCUITS, Circuit } from '../../data/wiring-data';
import { MAP_NODES, MAP_ROUTES, wireColorFor } from '../../data/jeep-map';
import { IconComponent } from '../../components/icon/icon.component';
import { JeepScene, ViewName } from './jeep-scene';

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

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((q) => {
      const id = q.get('circuit');
      if (id && CIRCUITS.some((c) => c.id === id)) this.applySelection(id);
    });
  }

  ngAfterViewInit(): void {
    try {
      this.scene = new JeepScene(this.host.nativeElement, (id) => this.select(id));
      this.scene.setSelection(this.selectedId());
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

  select(id: string | null): void {
    this.applySelection(id);
    this.router.navigate([], {
      queryParams: { circuit: id },
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

  private applySelection(id: string | null): void {
    this.selectedId.set(id);
    this.scene?.setSelection(id && this.hasRoute(id) ? id : null);
  }
}
