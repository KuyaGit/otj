import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlasherWiring } from '../../data/wiring-data';

// Shown with every flasher, so the circuit data only carries what is different about that circuit
const GENERAL_NOTES: string[] = [
  'The diagram looks at the flasher from the pin side. Pin positions and markings differ between brands, so follow the letters or numbers printed on your unit.',
  'A flasher is rated for a lamp load. Check that its rating covers every lamp it feeds, or it will flash too fast or not at all.',
  'LED lamps draw too little current for a standard flasher. Use an electronic LED-compatible flasher, or add load resistors across the lamps.',
];

@Component({
  selector: 'app-flasher-pinout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relay">
      <svg
        class="art"
        viewBox="0 0 520 300"
        role="img"
        aria-label="3-pin flasher seen from the pin side: 49 input on the left, 31 ground in the middle, 49a output to the lamps on the right"
      >
        <rect class="body" x="185" y="60" width="150" height="130" rx="12" />

        <!-- 49, left -->
        <rect class="pin power" x="203" y="150" width="22" height="30" rx="3" />
        <text class="num power" x="130" y="238" text-anchor="middle">49</text>
        <text class="sub" x="130" y="258" text-anchor="middle">Input (B)</text>
        <polyline class="lead power" points="214,180 214,215 130,215 130,222" />

        <!-- 31, centre -->
        <rect class="pin spare" x="249" y="150" width="22" height="30" rx="3" />
        <text class="num spare" x="260" y="238" text-anchor="middle">31</text>
        <text class="sub" x="260" y="258" text-anchor="middle">Ground (E)</text>
        <line class="lead spare" x1="260" y1="180" x2="260" y2="222" />

        <!-- 49a, right -->
        <rect class="pin out" x="295" y="150" width="22" height="30" rx="3" />
        <text class="num out" x="390" y="238" text-anchor="middle">49a</text>
        <text class="sub" x="390" y="258" text-anchor="middle">To lamps (L)</text>
        <polyline class="lead out" points="306,180 306,215 390,215 390,222" />

        <text class="sub" x="260" y="115" text-anchor="middle">Flasher</text>
      </svg>

      <div class="rows">
        <div class="row head" aria-hidden="true">
          <span>Pin</span><span>Role</span><span>Connect to</span><span>Wire</span><span>Fuse</span>
        </div>
        <div class="row" *ngFor="let p of wiring.pins" [attr.data-kind]="kind(p.pin)">
          <span class="pin-tag" data-label="Pin">{{ p.pin }}</span>
          <span data-label="Role">{{ p.role }}</span>
          <span data-label="Connect to">{{ p.connect }}</span>
          <span data-label="Wire">{{ p.wire }}</span>
          <span data-label="Fuse">{{ p.fuse }}</span>
        </div>
      </div>
    </div>

    <ul class="notes">
      <li *ngFor="let note of wiring.notes">{{ note }}</li>
      <li *ngFor="let note of general">{{ note }}</li>
    </ul>
  `,
  // the table, cards and notes look the same as the relay pinout; only the diagram colours are new
  styleUrls: ['../relay-pinout/relay-pinout.component.css', './flasher-pinout.component.css'],
})
export class FlasherPinoutComponent {
  @Input({ required: true }) wiring!: FlasherWiring;

  general = GENERAL_NOTES;

  kind(pin: string): 'power' | 'out' | 'spare' {
    if (pin === '49') return 'power';
    return pin === '49a' ? 'out' : 'spare';
  }
}
