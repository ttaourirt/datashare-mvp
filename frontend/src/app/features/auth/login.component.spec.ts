import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { environment } from '../../../environments/environment';

describe('LoginComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('logs in and opens the personal space (US04)', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.form.setValue({ email: 'a@b.fr', password: 'password1234' });
    fixture.componentInstance.submit();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({
      token: 'jwt', user: { id: 1, email: 'a@b.fr', name: null, createdAt: '' },
    });
    expect(navigate).toHaveBeenCalledWith('/files');
  });

  it('shows an error on wrong credentials', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.componentInstance.form.setValue({ email: 'a@b.fr', password: 'mauvais' });
    fixture.componentInstance.submit();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Email ou mot de passe incorrect.');
  });
});
