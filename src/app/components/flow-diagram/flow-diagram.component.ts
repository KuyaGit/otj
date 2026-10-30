import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CircuitStage } from '../../data/wiring-data';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icons';
import { ROLE_LABEL, StageRole, roleFor } from './flow-roles';

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
    <ol class="flow" [class.ground]="ground">
      <li class="step" *ngFor="let stage of stages; let i = index; let last = last" [attr.data-role]="roleOf(stage)">
        <div class="node">
          <span class="num" aria-hidden="true">{{ i + 1 }}</span>
          <app-icon [name]="iconFor(stage)"></app-icon>
          <div class="node-text">
            <div class="node-label">{{ stage.label }}</div>
            <div class="node-sub" *ngIf="stage.sub">{{ stage.sub }}</div>
            <div class="node-part" *ngIf="parts[i]"><span class="part-tag">Part</span>{{ parts[i] }}</div>
          </div>
          <span class="role">{{ roleLabel(stage) }}</span>
        </div>
        <app-icon class="arrow" name="chevron-right" *ngIf="!last" aria-hidden="true"></app-icon>
      </li>
    </ol>
  `,
  styleUrl: './flow-diagram.component.css',
})
export class FlowDiagramComponent {
  @Input() stages: CircuitStage[] = [];
  @Input() ground = false;
  // the part to buy for each stage, same order as stages (see data/stage-parts.ts)
  @Input() parts: (string | undefined)[] = [];

  roleOf(stage: CircuitStage): StageRole {
    return roleFor(stage.label);
  }

  roleLabel(stage: CircuitStage): string {
    return ROLE_LABEL[roleFor(stage.label)];
  }

  iconFor(stage: CircuitStage): IconName {
    if (stage.icon) return stage.icon;
    return STAGE_ICON_RULES.find(([re]) => re.test(stage.label))?.[1] ?? 'load';
  }
}
