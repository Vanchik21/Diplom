import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { CreateScenarioRequest, Scenario } from './scenario.models';

@Injectable({ providedIn: 'root' })
export class ScenarioService {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<Scenario[]>('/api/scenarios');
  }

  getById(id: string) {
    return this.http.get<Scenario>(`/api/scenarios/${id}`);
  }

  create(request: CreateScenarioRequest) {
    return this.http.post<Scenario>('/api/scenarios', request);
  }

  delete(id: string) {
    return this.http.delete<void>(`/api/scenarios/${id}`);
  }
}
