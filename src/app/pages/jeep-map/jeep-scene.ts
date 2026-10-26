import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CIRCUITS } from '../../data/wiring-data';
import {
  GROUND_WIRE_COLOR,
  Leg,
  MAP_NODES,
  MAP_ROUTES,
  NodeKind,
  Vec3,
  legPoints,
  wireColorFor,
  wireRadius,
} from '../../data/jeep-map';

export type ViewName = 'front' | 'side' | 'top' | 'dash';

const VIEWS: Record<ViewName, { pos: Vec3; target: Vec3 }> = {
  front: { pos: [2.9, 1.7, 3.7], target: [0, 0.9, 0] },
  side: { pos: [4.6, 1.2, 0.1], target: [0, 0.9, 0] },
  top: { pos: [0.01, 5.4, 0.1], target: [0, 0.8, 0] },
  dash: { pos: [-0.25, 1.55, -0.85], target: [0, 1.0, 0.4] },
};

const NODE_COLOR: Record<NodeKind, string> = {
  source: '#ffb300',
  hub: '#f57c00',
  switch: '#7cc4ff',
  load: '#e8e9ec',
  ground: GROUND_WIRE_COLOR,
};

const DIM_OPACITY = 0.1;
const FLOW_SPEED_MPS = 0.7;

export type PickResult = { circuitId: string } | { nodeId: string };

interface WireLeg {
  from: string;
  to: string;
  mesh: THREE.Mesh;
  pick: THREE.Mesh;
  curve: THREE.Curve<THREE.Vector3>;
  length: number;
  kind: Leg['kind'];
}

interface Wire {
  legs: WireLeg[];
  nodeIds: Set<string>;
}

interface NodeView {
  mesh: THREE.Mesh;
  label: CSS2DObject;
  kind: NodeKind;
}

// Rounds the corners of a polyline so wires bend like real harness instead of kinking
function roundedPath(points: THREE.Vector3[], radius = 0.07): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  let cursor = points[0].clone();
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1], corner = points[i], next = points[i + 1];
    const r = Math.min(radius, prev.distanceTo(corner) / 2, corner.distanceTo(next) / 2);
    const a = corner.clone().add(prev.clone().sub(corner).normalize().multiplyScalar(r));
    const b = corner.clone().add(next.clone().sub(corner).normalize().multiplyScalar(r));
    if (cursor.distanceTo(a) > 1e-6) path.add(new THREE.LineCurve3(cursor, a));
    path.add(new THREE.QuadraticBezierCurve3(a, corner.clone(), b));
    cursor = b;
  }
  const end = points[points.length - 1];
  if (cursor.distanceTo(end) > 1e-6) path.add(new THREE.LineCurve3(cursor, end));
  return path;
}

export class JeepScene {
  private renderer: THREE.WebGLRenderer;
  private labels = new CSS2DRenderer();
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
  private controls: OrbitControls;
  private observer: ResizeObserver;
  private raycaster = new THREE.Raycaster();
  private wires = new Map<string, Wire>();
  private nodes = new Map<string, NodeView>();
  private dots: { mesh: THREE.Mesh; leg: WireLeg; phase: number }[] = [];
  private flow = new THREE.Group();
  private selected: string | null = null;
  private focusNode: string | null = null;
  private showGround = true;
  private reducedMotion = false;
  private goal: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;
  private down: { x: number; y: number } | null = null;

  constructor(private host: HTMLElement, private onPick: (hit: PickResult) => void) {
    // throws when WebGL is unavailable: the caller shows a fallback message
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(this.renderer.domElement);

    this.labels.domElement.className = 'label-layer';
    host.appendChild(this.labels.domElement);

    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0f1115';
    this.scene.background = new THREE.Color(bg);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(3, 6, 4);
    this.scene.add(sun);

    const grid = new THREE.GridHelper(10, 20, 0x2a2e38, 0x1d2027);
    this.scene.add(grid);
    this.scene.add(this.buildJeep());
    this.buildWires();
    this.buildNodes();
    this.scene.add(this.flow);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 11;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.update();

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer.domElement.addEventListener('pointerdown', this.onDown);
    this.renderer.domElement.addEventListener('pointerup', this.onUp);
    this.controls.addEventListener('start', () => (this.goal = null));

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    const start = this.viewVectors('front');
    this.camera.position.copy(start.pos);
    this.controls.target.copy(start.target);
    this.controls.update();
    this.applyState();
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  setSelection(id: string | null): void {
    this.selected = id && this.wires.has(id) ? id : null;
    this.applyState();
  }

  // Highlights a part and every wire that touches it. `fly` also moves the camera to look at it.
  setFocusNode(id: string | null, fly = false): void {
    this.focusNode = id && this.nodes.has(id) ? id : null;
    this.applyState();
    if (fly && this.focusNode) {
      const target = this.nodes.get(this.focusNode)!.mesh.position.clone();
      const offset = this.camera.position.clone().sub(this.controls.target);
      offset.setLength(Math.min(offset.length(), 3.2));
      this.goal = { pos: target.clone().add(offset), target };
    }
  }

  setShowGround(show: boolean): void {
    this.showGround = show;
    this.applyState();
  }

  setView(name: ViewName): void {
    this.goal = this.viewVectors(name);
  }

  // On a tall (phone) canvas the Jeep would be cropped sideways, so back the camera off
  private viewVectors(name: ViewName): { pos: THREE.Vector3; target: THREE.Vector3 } {
    const v = VIEWS[name];
    const target = new THREE.Vector3(...v.target);
    const pos = new THREE.Vector3(...v.pos);
    const scale = Math.max(1, 1.15 / this.camera.aspect);
    return { pos: target.clone().add(pos.sub(target).multiplyScalar(scale)), target };
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.observer.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.onDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onUp);
    this.controls.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.domElement.remove();
  }

  // ------------------------------------------------------------------ build
  private buildJeep(): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: 0x5a6270 });
    const edges = (geo: THREE.BufferGeometry, x: number, y: number, z: number, rotZ = 0) => {
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), mat);
      l.position.set(x, y, z);
      l.rotation.z = rotZ;
      g.add(l);
    };
    const box = (w: number, h: number, d: number, x: number, y: number, z: number) =>
      edges(new THREE.BoxGeometry(w, h, d), x, y, z);
    const loop = (pts: Vec3[], closed = true) => {
      const geo = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p)));
      g.add(closed ? new THREE.LineLoop(geo, mat) : new THREE.Line(geo, mat));
    };

    box(1.24, 0.1, 3.4, 0, 0.45, 0);            // frame
    box(1.4, 0.45, 1.3, 0, 0.9, 1.15);          // hood / engine bay
    box(1.5, 0.55, 2.3, 0, 0.8, -0.65);         // tub
    loop([[-0.7, 1.1, 0.55], [0.7, 1.1, 0.55], [0.7, 1.65, 0.4], [-0.7, 1.65, 0.4]]);   // windshield
    loop([[-0.7, 1.7, 0.4], [0.7, 1.7, 0.4], [0.7, 1.7, -1.2], [-0.7, 1.7, -1.2]]);     // roof frame
    for (const x of [-0.7, 0.7]) {
      loop([[x, 1.7, 0.4], [x, 1.65, 0.4]], false);
      loop([[x, 1.7, -1.2], [x, 1.075, -1.2]], false);                                   // rear posts
    }
    for (const x of [-0.8, 0.8]) {
      for (const z of [1.15, -1.0]) {
        edges(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 20), x, 0.34, z, Math.PI / 2);   // wheels
      }
    }
    return g;
  }

  private buildWires(): void {
    CIRCUITS.forEach((circuit, index) => {
      const legs = MAP_ROUTES[circuit.id];
      if (!legs?.length) return;
      // small per-circuit offset so wires sharing a trunk stay distinguishable
      const off = new THREE.Vector3(((index % 4) - 1.5) * 0.011, (((index >> 2) % 4) - 1.5) * 0.011, 0);
      const radius = wireRadius(circuit.wireGauge);
      const wire: Wire = { legs: [], nodeIds: new Set() };

      for (const leg of legs) {
        wire.nodeIds.add(leg.from);
        wire.nodeIds.add(leg.to);
        const pts = legPoints(leg).map((p) => new THREE.Vector3(...p).add(off));
        const curve = roundedPath(pts);
        const length = curve.getLength();
        const segments = Math.max(12, Math.round(length * 28));
        const color = leg.kind === 'ground' ? GROUND_WIRE_COLOR : wireColorFor(circuit.id);

        const mesh = new THREE.Mesh(
          new THREE.TubeGeometry(curve, segments, radius, 6, false),
          new THREE.MeshStandardMaterial({ color, roughness: 0.55, transparent: true }),
        );
        const pick = new THREE.Mesh(
          new THREE.TubeGeometry(curve, segments, Math.max(radius, 0.03), 4, false),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        mesh.userData['circuitId'] = pick.userData['circuitId'] = circuit.id;
        this.scene.add(mesh, pick);
        wire.legs.push({ from: leg.from, to: leg.to, mesh, pick, curve, length, kind: leg.kind });
      }
      this.wires.set(circuit.id, wire);
    });
  }

  private buildNodes(): void {
    const used = new Set<string>();
    this.wires.forEach((w) => w.nodeIds.forEach((id) => used.add(id)));
    used.forEach((id) => {
      const n = MAP_NODES[id];
      const r = n.kind === 'hub' ? 0.07 : 0.048;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 12),
        new THREE.MeshStandardMaterial({ color: NODE_COLOR[n.kind], roughness: 0.4, transparent: true }),
      );
      mesh.position.set(...n.pos);
      mesh.userData['nodeId'] = id;

      const el = document.createElement('div');
      el.className = 'node-label';
      el.textContent = n.label;
      const label = new CSS2DObject(el);
      label.position.set(0, r + 0.06, 0);
      mesh.add(label);

      this.scene.add(mesh);
      this.nodes.set(id, { mesh, label, kind: n.kind });
    });
  }

  // ----------------------------------------------------------------- state
  private touchesFocus(leg: WireLeg): boolean {
    return !!this.focusNode && (leg.from === this.focusNode || leg.to === this.focusNode);
  }

  private applyState(): void {
    const sel = this.selected;
    const focus = this.focusNode;
    const neighbours = new Set<string>(focus ? [focus] : []);

    this.wires.forEach((wire, id) => {
      for (const leg of wire.legs) {
        const hidden = leg.kind === 'ground' && !this.showGround;
        leg.mesh.visible = !hidden;
        leg.pick.visible = !hidden;

        // a selected circuit wins over a focused part; with neither, show the overview
        const lit = sel !== null ? sel === id : focus ? this.touchesFocus(leg) : false;
        if (focus && sel === null && this.touchesFocus(leg)) {
          neighbours.add(leg.from);
          neighbours.add(leg.to);
        }
        const m = leg.mesh.material as THREE.MeshStandardMaterial;
        const dimmed = sel !== null || focus ? !lit : false;
        // with nothing selected, keep ground wires faint so the power wiring reads first
        const overview = leg.kind === 'ground' ? 0.35 : 0.9;
        m.opacity = dimmed ? DIM_OPACITY : lit ? 1 : overview;
        m.depthWrite = !dimmed;
        m.emissive.set(lit ? m.color : 0x000000);
        m.emissiveIntensity = lit ? 0.45 : 0;
      }
    });

    const onSelected = sel ? this.wires.get(sel)!.nodeIds : focus ? neighbours : null;
    this.nodes.forEach((n, id) => {
      const mat = n.mesh.material as THREE.MeshStandardMaterial;
      const active = !onSelected || onSelected.has(id);
      mat.opacity = active ? 1 : DIM_OPACITY + 0.1;
      const isFocus = id === focus;
      n.mesh.scale.setScalar(isFocus ? 1.7 : 1);
      mat.emissive.set(isFocus ? 0xffffff : 0x000000);
      mat.emissiveIntensity = isFocus ? 0.5 : 0;
      const show = onSelected ? onSelected.has(id) : n.kind === 'hub' || n.kind === 'source';
      n.label.element.classList.toggle('on', show);
    });

    this.rebuildFlow();
  }

  private rebuildFlow(): void {
    this.flow.clear();
    this.dots = [];
    if (this.reducedMotion || (!this.selected && !this.focusNode)) return;
    const legs = this.selected
      ? this.wires.get(this.selected)!.legs
      : [...this.wires.values()].flatMap((w) => w.legs.filter((l) => this.touchesFocus(l)));
    const geo = new THREE.SphereGeometry(0.03, 8, 6);
    for (const leg of legs) {
      if (leg.kind === 'ground' && !this.showGround) continue;
      for (let k = 0; k < 2; k++) {
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        this.flow.add(mesh);
        this.dots.push({ mesh, leg, phase: k / 2 });
      }
    }
  }

  // ------------------------------------------------------------------ loop
  private frame(timeMs: number): void {
    if (this.goal) {
      this.camera.position.lerp(this.goal.pos, 0.1);
      this.controls.target.lerp(this.goal.target, 0.1);
      if (this.camera.position.distanceTo(this.goal.pos) < 0.02) this.goal = null;
    }
    const t = timeMs / 1000;
    for (const d of this.dots) {
      const u = (t * FLOW_SPEED_MPS / d.leg.length + d.phase) % 1;
      d.mesh.position.copy(d.leg.curve.getPointAt(u));
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }

  private resize(): void {
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h);
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // --------------------------------------------------------------- picking
  private onDown = (e: PointerEvent) => (this.down = { x: e.clientX, y: e.clientY });

  private onUp = (e: PointerEvent) => {
    // a drag rotates the scene, only a click picks
    if (!this.down || Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 4) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(
      new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1),
      this.camera,
    );
    const targets: THREE.Object3D[] = [...this.nodes.values()].map((n) => n.mesh);
    this.wires.forEach((w) => w.legs.forEach((l) => l.pick.visible && targets.push(l.pick)));
    const hit = this.raycaster.intersectObjects(targets, false)[0]?.object;
    if (!hit) return;

    if (hit.userData['nodeId']) this.onPick({ nodeId: hit.userData['nodeId'] });
    else if (hit.userData['circuitId']) this.onPick({ circuitId: hit.userData['circuitId'] });
  };
}
