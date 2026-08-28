import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TagResponse { id: number; name: string; }

export interface FileResponse {
  id: number;
  publicToken: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  expiresAt: string;
  passwordProtected: boolean;
  expired: boolean;
  downloadUrl: string;
  tags: TagResponse[];
}

export interface PublicFileMeta {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string;
  passwordProtected: boolean;
}

export interface UploadOptions {
  expiresInDays?: number;
  password?: string;
  tagIds?: number[];
}

@Injectable({ providedIn: 'root' })
export class FileApi {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(includeExpired = false): Observable<FileResponse[]> {
    return this.http.get<FileResponse[]>(`${this.api}/files?includeExpired=${includeExpired}`);
  }

  upload(file: File, opts: UploadOptions = {}): Observable<FileResponse> {
    const fd = this.buildFormData(file, opts);
    return this.http.post<FileResponse>(`${this.api}/files`, fd);
  }

  uploadAnonymous(file: File, opts: UploadOptions = {}): Observable<FileResponse> {
    const fd = this.buildFormData(file, opts);
    return this.http.post<FileResponse>(`${this.api}/public/files`, fd);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/files/${id}`);
  }

  publicMeta(token: string): Observable<PublicFileMeta> {
    return this.http.get<PublicFileMeta>(`${this.api}/public/files/${token}/meta`);
  }

  publicDownload(token: string, password?: string): Observable<Blob> {
    return this.http.post(`${this.api}/public/files/${token}/download`, { password }, { responseType: 'blob' });
  }

  private buildFormData(file: File, opts: UploadOptions): FormData {
    const fd = new FormData();
    fd.append('file', file);
    if (opts.expiresInDays) fd.append('expiresInDays', String(opts.expiresInDays));
    if (opts.password) fd.append('password', opts.password);
    (opts.tagIds ?? []).forEach(id => fd.append('tagIds', String(id)));
    return fd;
  }
}
