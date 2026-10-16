import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { components } from '../../api-types';
export type DemoRecord = components['schemas']['DemoRecordDto'];
@Injectable({ providedIn: 'root' })
export class DemoRecordApi {
  private readonly http = inject(HttpClient);
  read(id: string): Observable<DemoRecord> {
    return this.http.get<DemoRecord>(`/api/v1/demo-records/${encodeURIComponent(id)}`);
  }
}
export function errorKey(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'unexpectedError';
  const body: unknown = error.error;
  if (
    body &&
    typeof body === 'object' &&
    'code' in body &&
    typeof body.code === 'string' &&
    ['demoRecordNotFound', 'databaseUnavailable', 'validationError'].includes(body.code)
  )
    return body.code;
  return 'unexpectedError';
}
