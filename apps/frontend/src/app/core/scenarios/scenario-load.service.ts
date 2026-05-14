import { Injectable, signal } from '@angular/core';

interface PendingScenario {
  params: Record<string, unknown>;
  predictions: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class ScenarioLoadService {
  private readonly _pending = signal<PendingScenario | null>(null);

  schedule(params: Record<string, unknown>, predictions: Record<string, number> = {}): void {
    this._pending.set({ params, predictions });
  }

  consume(): PendingScenario | null {
    const pending = this._pending();
    this._pending.set(null);
    return pending;
  }
}
