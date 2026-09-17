import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICONS, IconName } from './icons';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <path *ngFor="let d of paths" [attr.d]="d"></path>
    </svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1em;
      height: 1em;
      flex: none;
      vertical-align: -0.125em;
    }
    svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  `],
})
export class IconComponent {
  protected paths: readonly string[] = [];

  @Input({ required: true }) set name(value: IconName) {
    this.paths = ICONS[value] ?? [];
  }
}
