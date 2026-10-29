import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { SHOPPING, SHOPPING_NOTES } from '../../data/shopping-list';
import { IconComponent } from '../../components/icon/icon.component';

// Item ids are the saved-data contract (see data/shopping-list.ts), so a rename needs a new key
const KEY = 'jeep-shopping-list-v1';

const PAGE_DESCRIPTION =
  'Checklist of the relays, flashers, wire, fuses and hardware to buy for the Jeep wiring, saved in your browser.';

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './shopping-list.component.html',
  styleUrl: './shopping-list.component.css',
})
export class ShoppingListComponent implements OnInit, OnDestroy {
  private title = inject(Title);
  private meta = inject(Meta);
  private previousTitle = '';

  sections = SHOPPING;
  notes = SHOPPING_NOTES;

  checked = signal<Record<string, true>>({});
  savedMsg = signal('Saved on this device');
  confirmReset = signal(false);

  progress = computed(() => {
    const checked = this.checked();
    const perSection: Record<string, { done: number; total: number }> = {};
    let total = 0;
    let done = 0;
    for (const s of this.sections) {
      const entry = { done: 0, total: s.items.length };
      for (const item of s.items) if (checked[item.id]) entry.done++;
      perSection[s.id] = entry;
      total += entry.total;
      done += entry.done;
    }
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0, perSection };
  });

  ngOnInit(): void {
    this.previousTitle = this.title.getTitle();
    this.title.setTitle('Shopping List');
    this.meta.updateTag({ name: 'description', content: PAGE_DESCRIPTION });
    this.load();
  }

  ngOnDestroy(): void {
    this.title.setTitle(this.previousTitle);
    this.meta.removeTag('name="description"');
  }

  toggle(id: string, on: boolean): void {
    this.checked.update((c) => {
      const next = { ...c };
      if (on) next[id] = true;
      else delete next[id];
      return next;
    });
    this.save();
  }

  reset(): void {
    this.checked.set({});
    this.save();
    this.confirmReset.set(false);
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      // drop ids that no longer exist in the list
      const known = new Set(this.sections.flatMap((s) => s.items.map((i) => i.id)));
      const checked: Record<string, true> = {};
      for (const id of Object.keys(saved?.checked ?? {})) if (known.has(id)) checked[id] = true;
      this.checked.set(checked);
    } catch {
      // unreadable storage or corrupt JSON: start empty
    }
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({ checked: this.checked() }));
      this.savedMsg.set(
        'Saved on this device · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      );
    } catch {
      this.savedMsg.set("This browser isn't saving, so your ticks will be lost when you leave.");
    }
  }
}
