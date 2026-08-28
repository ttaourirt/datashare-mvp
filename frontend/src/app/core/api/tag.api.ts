import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TagResponse } from './file.api';

@Injectable({ providedIn: 'root' })
export class TagApi {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(): Observable<TagResponse[]> {
    return this.http.get<TagResponse[]>(`${this.api}/tags`);
  }

  create(name: string): Observable<TagResponse> {
    return this.http.post<TagResponse>(`${this.api}/tags`, { name });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/tags/${id}`);
  }
}
