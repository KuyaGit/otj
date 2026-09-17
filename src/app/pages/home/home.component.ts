import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CATEGORIES, CIRCUITS, Category, Circuit } from '../../data/wiring-data';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  categories: Category[] = CATEGORIES;
  circuits: Circuit[] = CIRCUITS;

  circuitsFor(categoryId: string): Circuit[] {
    return this.circuits.filter((c) => c.category === categoryId);
  }
}
