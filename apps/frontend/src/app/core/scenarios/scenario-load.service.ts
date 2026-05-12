import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScenarioLoadService {
  private readonly _pendingParams = signal<Record<string, unknown> | null>(null);

  schedule(params: Record<string, unknown>): void {
    this._pendingParams.set(params);
  }

  consume(): Record<string, unknown> | null {
    const params = this._pendingParams();
    this._pendingParams.set(null);
    return params;
  }
}
