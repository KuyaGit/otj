import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RelayWiring } from '../../data/wiring-data';

// Shown with every relay, so the circuit data only carries what is different about that circuit
const GENERAL_NOTES: string[] = [
  'The diagram looks at the relay from the pin side, underneath. Match the numbers moulded next to each terminal on your relay, because some relays are numbered differently.',
  'Coil polarity follows the DIN 72552 standard: 85 is negative and 86 is positive. A plain relay works either way round, but one with a built-in diode or resistor must have its coil the right way. If yours is marked the other way, swap the two coil wires.',
  'Take the coil power from the same fused supply as pin 30 where you can, so one fuse protects both the coil and the load.',
  'Bench test before fitting: 12V across 85 and 86 should click. Pin 30 then connects to 87, and it connects to 87a only while the coil is off.',
];

@Component({
  selector: 'app-relay-pinout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relay">
      <svg
        class="art"
        viewBox="0 0 520 300"
        role="img"
        aria-label="5-pin relay seen from the pin side: 87 normally open at the top, 86 coil positive on the left, 85 coil negative on the right, 87a normally closed in the middle, 30 common at the bottom"
      >
        <rect class="body" x="185" y="70" width="150" height="150" rx="12" />

        <!-- 87, top -->
        <rect class="pin power" x="245" y="83" width="30" height="22" rx="3" />
        <text class="num power" x="260" y="38" text-anchor="middle">87</text>
        <text class="sub" x="260" y="56" text-anchor="middle">Normally open</text>
        <line class="lead power" x1="260" y1="62" x2="260" y2="83" />

        <!-- 86, left -->
        <rect class="pin coil" x="198" y="130" width="22" height="30" rx="3" />
        <text class="num coil" x="150" y="140" text-anchor="end">86</text>
        <text class="sub" x="150" y="158" text-anchor="end">Coil +</text>
        <line class="lead coil" x1="156" y1="145" x2="198" y2="145" />

        <!-- 85, right -->
        <rect class="pin coil" x="300" y="130" width="22" height="30" rx="3" />
        <text class="num coil" x="370" y="140" text-anchor="start">85</text>
        <text class="sub" x="370" y="158" text-anchor="start">Coil –</text>
        <line class="lead coil" x1="322" y1="145" x2="364" y2="145" />

        <!-- 87a, centre -->
        <rect class="pin spare" x="245" y="138" width="30" height="22" rx="3" />
        <text class="num spare" x="370" y="218" text-anchor="start">87a</text>
        <text class="sub" x="370" y="236" text-anchor="start">Not used</text>
        <polyline class="lead spare" points="275,152 300,195 360,213" />

        <!-- 30, bottom -->
        <rect class="pin power" x="250" y="180" width="20" height="30" rx="3" />
        <text class="num power" x="260" y="262" text-anchor="middle">30</text>
        <text class="sub" x="260" y="280" text-anchor="middle">Common</text>
        <line class="lead power" x1="260" y1="210" x2="260" y2="244" />
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
  styleUrl: './relay-pinout.component.css',
})
export class RelayPinoutComponent {
  @Input({ required: true }) wiring!: RelayWiring;

  general = GENERAL_NOTES;

  kind(pin: string): 'coil' | 'power' | 'spare' {
    if (pin === '85' || pin === '86') return 'coil';
    return pin === '87a' ? 'spare' : 'power';
  }
}
