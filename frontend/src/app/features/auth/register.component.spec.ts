import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RegisterComponent } from './register.component';
import { environment } from '../../../environments/environment';

describe('RegisterComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function setup() {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('requires a valid email and a password of 8+ characters (US03)', () => {
    const { component } = setup();
    component.form.setValue({ email: 'pas-un-email', password: 'court', confirm: 'court' });
    expect(component.form.invalid).toBe(true);
  });

  it('requires both passwords to match', () => {
    const { component, fixture } = setup();
    component.form.setValue({ email: 'a@b.fr', password: 'password1234', confirm: 'password9999' });
    component.form.controls.confirm.markAsTouched();
    fixture.detectChanges();
    expect(component.mismatch()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('ne correspondent pas');
  });

  it('registers then redirects to login', () => {
    const { component } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.form.setValue({ email: 'a@b.fr', password: 'password1234', confirm: 'password1234' });
    component.submit();
    const req = http.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.body).toEqual({ email: 'a@b.fr', password: 'password1234', name: undefined });
    req.flush({ id: 1, email: 'a@b.fr', name: null, createdAt: '' });
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { registered: '1' } });
  });

  it('explains a duplicate email (409)', () => {
    const { component } = setup();
    component.form.setValue({ email: 'a@b.fr', password: 'password1234', confirm: 'password1234' });
    component.submit();
    http.expectOne(`${environment.apiUrl}/auth/register`).flush({}, { status: 409, statusText: 'Conflict' });
    expect(component.error()).toBe('Cet email est déjà utilisé.');
  });
});
