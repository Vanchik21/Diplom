import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { PhysicsCategory } from '@physis/sdk';
import { ModuleRegistryService, type RegistryEntry } from '../../physics-modules/registry.service';
import { ModuleCardComponent } from './module-card/module-card.component';

type DifficultyFilter = 'all' | 'school' | 'university';
type CategoryFilter = PhysicsCategory | 'all';

@Component({
  selector: 'app-modules-browser',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, ModuleCardComponent],
  templateUrl: './modules-browser.component.html',
  styleUrl: './modules-browser.component.scss',
})
export class ModulesBrowserComponent {
  private readonly registry = inject(ModuleRegistryService);

  protected readonly categoryFilter = signal<CategoryFilter>('all');
  protected readonly difficultyFilter = signal<DifficultyFilter>('all');

  protected readonly categories: CategoryFilter[] = [
    'all', 'mechanics', 'em', 'waves', 'thermo', 'gravity',
  ];

  protected readonly filteredEntries = computed<RegistryEntry[]>(() => {
    const category = this.categoryFilter();
    const difficulty = this.difficultyFilter();

    return this.registry.getAll().filter(entry => {
      const categoryMatch = category === 'all' || entry.meta.category === category;
      const difficultyMatch = difficulty === 'all' || entry.meta.difficulty === difficulty;
      return categoryMatch && difficultyMatch;
    });
  });

  protected setCategoryFilter(value: string): void {
    this.categoryFilter.set(value as CategoryFilter);
  }

  protected setDifficultyFilter(value: string): void {
    this.difficultyFilter.set(value as DifficultyFilter);
  }
}
