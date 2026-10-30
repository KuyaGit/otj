import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Circuit, CIRCUITS, CATEGORIES } from '../../data/wiring-data';
import { FlowDiagramComponent } from '../../components/flow-diagram/flow-diagram.component';
import { IconComponent } from '../../components/icon/icon.component';
import { SchematicComponent } from '../../components/schematic/schematic.component';
import { RelayPinoutComponent } from '../../components/relay-pinout/relay-pinout.component';
import { FlasherPinoutComponent } from '../../components/flasher-pinout/flasher-pinout.component';
import { CIRCUIT_SCHEMATICS } from '../../data/circuit-schematics';
import { IconName } from '../../components/icon/icons';
import { partsFor } from '../../data/stage-parts';
import { wireColorFor, wireColorNameFor } from '../../data/jeep-map';
import { wireLabel } from '../../schematics/schematic';

@Component({
  selector: 'app-accessory-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FlowDiagramComponent, IconComponent, SchematicComponent, RelayPinoutComponent, FlasherPinoutComponent],
  templateUrl: './accessory-detail.component.html',
  styleUrl: './accessory-detail.component.css',
})
export class AccessoryDetailComponent {
  circuit?: Circuit;
  categoryName = '';
  categoryIcon: IconName = 'load';
  schematics = CIRCUIT_SCHEMATICS;
  parts: (string | undefined)[] = [];
  wireText = '';
  wireHex = '';

  constructor(private route: ActivatedRoute) {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.circuit = CIRCUITS.find((c) => c.id === id);
      if (this.circuit) {
        const category = CATEGORIES.find((cat) => cat.id === this.circuit!.category);
        this.categoryName = category?.name ?? '';
        this.categoryIcon = category?.icon ?? 'load';
        this.parts = partsFor(this.circuit);
        this.wireText = `${wireLabel(this.circuit)} ${wireColorNameFor(this.circuit.id).toLowerCase()}`;
        this.wireHex = wireColorFor(this.circuit.id);
      }
    });
  }
}
