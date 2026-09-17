import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { IconComponent } from './components/icon/icon.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, IconComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'Jeep Wiring Guide';
}
