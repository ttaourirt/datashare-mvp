import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserResponse {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

const TOKEN_KEY = 'datashare.token';
const USER_KEY = 'datashare.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  readonly user = signal<UserResponse | null>(this.loadUser());
  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  register(email: string, password: string, name?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/auth/register`, { email, password, name })
      .pipe(tap(r => this.persist(r)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/auth/login`, { email, password })
      .pipe(tap(r => this.persist(r)));
  }

  me(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.api}/auth/me`)
      .pipe(tap(u => {
        this.user.set(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      }));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.user.set(null);
  }

  private persist(r: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, r.token);
    localStorage.setItem(USER_KEY, JSON.stringify(r.user));
    this.token.set(r.token);
    this.user.set(r.user);
  }

  private loadUser(): UserResponse | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as UserResponse : null;
  }
}
