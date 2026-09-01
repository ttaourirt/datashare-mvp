import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
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

  it('should register but NOT persist a token (user must log in after)', () => {
    service.register('alice@example.com', 'password1234', 'Alice').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, email: 'alice@example.com', name: 'Alice', createdAt: '2026-09-01T00:00:00Z' });
    expect(service.token()).toBeNull();
    expect(service.user()).toBeNull();
    expect(localStorage.getItem('datashare.token')).toBeNull();
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
