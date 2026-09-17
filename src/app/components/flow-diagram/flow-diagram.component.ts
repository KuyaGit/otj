import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CircuitStage } from '../../data/wiring-data';

@Component({
  selector: 'app-flow-diagram',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flow" [class.ground]="ground">
      <ng-container *ngFor="let stage of stages; let last = last">
        <div class="node">
          <div class="node-label">{{ stage.label }}</div>
          <div class="node-sub" *ngIf="stage.sub">{{ stage.sub }}</div>
        </div>
        <div class="arrow" *ngIf="!last">→</div>
      </ng-container>
    </div>
  `,
  styleUrl: './flow-diagram.component.css',
})
export class FlowDiagramComponent {
  @Input() stages: CircuitStage[] = [];
  @Input() ground = false;
}
