import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import type {
  ClassroomCreateDto,
  ClassroomDetailDto,
  ClassroomSummaryDto,
  ClassroomUpdateDto,
  JoinClassroomDto,
} from './classroom.models';

const BASE = '/api/classrooms';

@Injectable({ providedIn: 'root' })
export class ClassroomsService {
  private readonly http = inject(HttpClient);

  readonly classrooms = signal<ClassroomSummaryDto[]>([]);

  loadMine(): void {
    this.http.get<ClassroomSummaryDto[]>(`${BASE}/mine`).subscribe({
      next: list => this.classrooms.set(list),
      error: () => {},
    });
  }

  getAll(): Observable<ClassroomSummaryDto[]> {
    return this.http.get<ClassroomSummaryDto[]>(`${BASE}/mine`);
  }

  getById(id: string): Observable<ClassroomDetailDto> {
    return this.http.get<ClassroomDetailDto>(`${BASE}/${id}`);
  }

  create(dto: ClassroomCreateDto): Observable<ClassroomSummaryDto> {
    return this.http.post<ClassroomSummaryDto>(BASE, dto).pipe(
      tap(created => this.classrooms.update(list => [created, ...list])),
    );
  }

  update(id: string, dto: ClassroomUpdateDto): Observable<ClassroomSummaryDto> {
    return this.http.put<ClassroomSummaryDto>(`${BASE}/${id}`, dto).pipe(
      tap(updated =>
        this.classrooms.update(list => list.map(c => (c.id === id ? updated : c))),
      ),
    );
  }

  join(dto: JoinClassroomDto): Observable<ClassroomSummaryDto> {
    return this.http.post<ClassroomSummaryDto>(`${BASE}/join`, dto).pipe(
      tap(joined => this.classrooms.update(list => [joined, ...list])),
    );
  }

  removeMember(classroomId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/${classroomId}/members/${userId}`);
  }

  rotateCode(classroomId: string): Observable<{ inviteCode: string }> {
    return this.http.post<{ inviteCode: string }>(`${BASE}/${classroomId}/rotate-code`, {});
  }
}
