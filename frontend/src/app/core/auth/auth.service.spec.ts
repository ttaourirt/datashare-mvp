import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService, AuthResponse } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should register and persist token + user', () => {
    let received: AuthResponse | undefined;
    service.register('alice@example.com', 'password1234', 'Alice').subscribe(r => received = r);
    const req = http.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    req.flush({
      token: 'jwt.abc',
      user: { id: 1, email: 'alice@example.com', name: 'Alice', createdAt: '2026-08-18T00:00:00Z' },
    });
    expect(received?.token).toBe('jwt.abc');
    expect(service.token()).toBe('jwt.abc');
    expect(service.user()?.email).toBe('alice@example.com');
    expect(localStorage.getItem('datashare.token')).toBe('jwt.abc');
  });

  it('should login and set signals', () => {
    service.login('bob@example.com', 'password1234').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush({
      token: 'jwt.bob',
      user: { id: 2, email: 'bob@example.com', name: 'Bob', createdAt: '2026-08-18T00:00:00Z' },
    });
    expect(service.token()).toBe('jwt.bob');
  });

  it('logout clears storage and signals', () => {
    localStorage.setItem('datashare.token', 'x');
    localStorage.setItem('datashare.user', '{"id":1,"email":"x","name":null,"createdAt":"2026-08-18T00:00:00Z"}');
    service.logout();
    expect(service.token()).toBeNull();
    expect(service.user()).toBeNull();
    expect(localStorage.getItem('datashare.token')).toBeNull();
  });
});
