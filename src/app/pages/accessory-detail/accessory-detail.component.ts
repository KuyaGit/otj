import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Circuit, CIRCUITS, CATEGORIES } from '../../data/wiring-data';
import { FlowDiagramComponent } from '../../components/flow-diagram/flow-diagram.component';

@Component({
  selector: 'app-accessory-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FlowDiagramComponent],
  templateUrl: './accessory-detail.component.html',
  styleUrl: './accessory-detail.component.css',
})
export class AccessoryDetailComponent {
  circuit?: Circuit;
  categoryName = '';

  constructor(private route: ActivatedRoute) {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.circuit = CIRCUITS.find((c) => c.id === id);
      if (this.circuit) {
        this.categoryName =
          CATEGORIES.find((cat) => cat.id === this.circuit!.category)?.name ?? '';
      }
    });
  }
}
