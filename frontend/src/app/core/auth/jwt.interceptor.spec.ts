import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { jwtInterceptor } from './jwt.interceptor';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('JWT interceptor & auth guard', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr(), withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('adds the bearer token when logged in', () => {
    auth.token.set('jwt.abc');
    client.get('/api/v1/files').subscribe();
    expect(http.expectOne('/api/v1/files').request.headers.get('Authorization')).toBe('Bearer jwt.abc');
  });

  it('sends no Authorization header when anonymous', () => {
    client.get('/api/v1/public/files/x/meta').subscribe();
    expect(http.expectOne('/api/v1/public/files/x/meta').request.headers.has('Authorization')).toBe(false);
  });

  it('logs out and redirects on 401 (expired token)', () => {
    auth.token.set('jwt.expired');
    client.get('/api/v1/files').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/files').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.token()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('guard lets a logged-in user through and redirects others to login', () => {
    const run = () => TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(run()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    auth.token.set('jwt');
    expect(run()).toBe(true);
  });
});
