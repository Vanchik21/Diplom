import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  AssignmentCreateDto,
  AssignmentDetailDto,
  AssignmentSummaryDto,
  SubmissionResultDto,
  SubmitAssignmentDto,
} from './assignment.models';

@Injectable({ providedIn: 'root' })
export class AssignmentsService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/assignments';

  create(dto: AssignmentCreateDto): Observable<AssignmentSummaryDto> {
    return this.http.post<AssignmentSummaryDto>(this.base, dto);
  }

  getForClassroom(classroomId: string): Observable<AssignmentSummaryDto[]> {
    return this.http.get<AssignmentSummaryDto[]>(`${this.base}/classroom/${classroomId}`);
  }

  getById(id: string): Observable<AssignmentDetailDto> {
    return this.http.get<AssignmentDetailDto>(`${this.base}/${id}`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  submit(id: string, dto: SubmitAssignmentDto): Observable<SubmissionResultDto> {
    return this.http.post<SubmissionResultDto>(`${this.base}/${id}/submit`, dto);
  }
}
