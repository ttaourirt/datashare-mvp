import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { DownloadComponent } from './download.component';
import { environment } from '../../../environments/environment';

const metaUrl = `${environment.apiUrl}/public/files/tok/meta`;
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000 - 60_000).toISOString();

describe('DownloadComponent (US02)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ token: 'tok' }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function load(body: object, status = 200) {
    const fixture = TestBed.createComponent(DownloadComponent);
    const req = http.expectOne(metaUrl);
    if (status === 200) req.flush(body);
    else req.flush({}, { status, statusText: 'err' });
    fixture.detectChanges();
    return fixture;
  }

  const meta = (days: number, passwordProtected = false) =>
    ({ originalName: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: 2_700_000, expiresAt: inDays(days), passwordProtected });

  it('shows metadata and an info callout before download', () => {
    const el: HTMLElement = load(meta(3)).nativeElement;
    expect(el.textContent).toContain('photo.jpg');
    expect(el.textContent).toContain('2,6 Mo');
    expect(el.querySelector('.callout--info')?.textContent).toContain('dans 3 jours');
    expect(el.querySelector('#dl-password')).toBeNull();
  });

  it('warns when the file expires tomorrow', () => {
    const el: HTMLElement = load(meta(1)).nativeElement;
    expect(el.querySelector('.callout--warning')?.textContent).toContain('demain');
  });

  it('requires the password when the file is protected', () => {
    const fixture = load(meta(3, true));
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type=submit]');
    expect(fixture.nativeElement.querySelector('#dl-password')).not.toBeNull();
    expect(button.disabled).toBe(true);
  });

  it('explains an expired link (410)', () => {
    const el: HTMLElement = load({}, 410).nativeElement;
    expect(el.querySelector('.callout--error')?.textContent).toContain('a expiré');
  });

  it('explains an unknown link (404)', () => {
    const el: HTMLElement = load({}, 404).nativeElement;
    expect(el.querySelector('.callout--error')?.textContent).toContain('invalide');
  });
});
