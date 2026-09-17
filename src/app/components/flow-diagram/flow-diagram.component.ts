import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CircuitStage } from '../../data/wiring-data';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icons';

const STAGE_ICON_RULES: [RegExp, IconName][] = [
  [/ground|chassis|\(–\)|negative/i, 'ground'],
  [/fuse/i, 'fuse'],
  [/relay|flasher/i, 'relay'],
  [/switch/i, 'switch'],
  [/battery|\(\+\)/i, 'battery'],
  [/lamp|light|beam/i, 'bulb'],
  [/pump/i, 'pump'],
  [/fan/i, 'fan'],
  [/horn/i, 'horn'],
  [/radio/i, 'radio'],
  [/amplifier/i, 'amplifier'],
  [/gauge|voltmeter|indicator/i, 'gauge'],
  [/wire|cable|awg/i, 'wire'],
];

@Component({
  selector: 'app-flow-diagram',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="flow" [class.ground]="ground">
      <ng-container *ngFor="let stage of stages; let last = last">
        <div class="node">
          <app-icon [name]="iconFor(stage)"></app-icon>
          <div class="node-text">
            <div class="node-label">{{ stage.label }}</div>
            <div class="node-sub" *ngIf="stage.sub">{{ stage.sub }}</div>
          </div>
        </div>
        <app-icon class="arrow" name="chevron-right" *ngIf="!last"></app-icon>
      </ng-container>
    </div>
  `,
  styleUrl: './flow-diagram.component.css',
})
export class FlowDiagramComponent {
  @Input() stages: CircuitStage[] = [];
  @Input() ground = false;

  iconFor(stage: CircuitStage): IconName {
    if (stage.icon) return stage.icon;
    return STAGE_ICON_RULES.find(([re]) => re.test(stage.label))?.[1] ?? 'load';
  }
}
