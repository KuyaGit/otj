import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FUSE_PANEL, WIRE_COLORS, NEXT_STEPS, CIRCUITS } from '../../data/wiring-data';
import { FlowDiagramComponent } from '../../components/flow-diagram/flow-diagram.component';
import { IconComponent } from '../../components/icon/icon.component';

@Component({
  selector: 'app-reference',
  standalone: true,
  imports: [CommonModule, RouterLink, FlowDiagramComponent, IconComponent],
  templateUrl: './reference.component.html',
  styleUrl: './reference.component.css',
})
export class ReferenceComponent {
  fusePanel = FUSE_PANEL;
  wireColors = WIRE_COLORS;
  nextSteps = NEXT_STEPS;

  mainArchitecture = [
    { label: 'Battery (+)' },
    { label: 'Main fuse', sub: '60–100A' },
    { label: 'Fuse / relay panel' },
    { label: '16 fused circuits', icon: 'load' as const },
    { label: 'All accessories' },
  ];

  groundPlan = [
    { label: 'Battery (–)' },
    { label: 'Chassis ground', sub: '4 AWG' },
    { label: 'Engine ground', sub: '4 AWG' },
    { label: 'Body ground', sub: '10 AWG' },
  ];
}
