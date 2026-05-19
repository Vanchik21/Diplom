import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  ClassroomOverviewDto,
  ModuleCatalogEntry,
  PersonalAnalyticsDto,
  StudentTimelineDto,
} from './analytics.models';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);

  getModuleCatalog(): Observable<ModuleCatalogEntry[]> {
    return this.http.get<ModuleCatalogEntry[]>('/api/modules/catalog');
  }

  getClassroomOverview(classroomId: string): Observable<ClassroomOverviewDto> {
    return this.http.get<ClassroomOverviewDto>(
      `/api/analytics/classrooms/${classroomId}/overview`,
    );
  }

  getStudentTimeline(classroomId: string, studentId: string): Observable<StudentTimelineDto> {
    return this.http.get<StudentTimelineDto>(
      `/api/analytics/classrooms/${classroomId}/students/${studentId}`,
    );
  }

  getPersonal(): Observable<PersonalAnalyticsDto> {
    return this.http.get<PersonalAnalyticsDto>('/api/analytics/me');
  }
}
