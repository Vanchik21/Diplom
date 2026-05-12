import { Injectable } from '@angular/core';
import type { ModuleMetadata, PhysicsCategory, PhysicsModule } from '@physis/sdk';
import { type ModuleFactory, MODULES } from './manifest';

export interface RegistryEntry {
  factory: ModuleFactory;
  meta: ModuleMetadata;
}

@Injectable({ providedIn: 'root' })
export class ModuleRegistryService {
  private readonly entries: RegistryEntry[] = MODULES.map(Factory => ({
    factory: Factory,
    meta: new Factory().meta,
  }));

  getAll(): RegistryEntry[] {
    return this.entries;
  }

  getById(id: string): RegistryEntry | undefined {
    return this.entries.find(e => e.meta.id === id);
  }

  getByCategory(category: PhysicsCategory): RegistryEntry[] {
    return this.entries.filter(e => e.meta.category === category);
  }

  create(id: string): PhysicsModule | undefined {
    const entry = this.getById(id);
    return entry ? new entry.factory() : undefined;
  }
}
