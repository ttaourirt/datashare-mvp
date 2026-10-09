import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UploadModalComponent } from './upload-modal.component';
import { environment } from '../../../environments/environment';

describe('UploadModalComponent', () => {
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
        });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    function setup(anonymous = false, file: File | null = new File(['hello'], 'hello.txt', { type: 'text/plain' })) {
        const fixture = TestBed.createComponent(UploadModalComponent);
        fixture.componentRef.setInput('anonymous', anonymous);
        fixture.componentRef.setInput('initialFile', file);
        fixture.detectChanges();
        const component = fixture.componentInstance;
        return { fixture, component };
    }

    it('rejects a file password shorter than 6 characters (US09)', () => {
        const { component, fixture } = setup();
        component.form.controls.password.setValue('12345');
        component.form.controls.password.markAsDirty();
        fixture.detectChanges();

        expect(component.form.invalid).toBe(true);
        expect(component.passwordTooShort()).toBe(true);
        component.submit();
        http.expectNone(`${environment.apiUrl}/files`);
    });

    it('rejects an expiration above 7 days (US10)', () => {
        const { component } = setup();
        component.form.controls.expiresInDays.setValue(8);
        expect(component.form.invalid).toBe(true);
    });

    it('uploads with expiration, password and tags for a logged-in user (US01)', () => {
        const { component } = setup();
        component.form.setValue({ expiresInDays: 3, password: 'secret1' });
        component.tags.set(['projet', 'client']);
        component.submit();

        const req = http.expectOne(`${environment.apiUrl}/files`);
        const body = req.request.body as FormData;
        expect(body.get('expiresInDays')).toBe('3');
        expect(body.get('password')).toBe('secret1');
        expect(body.getAll('tags')).toEqual(['projet', 'client']);
        req.flush({});
    });

    it('uses the public endpoint and hides tags when anonymous (US07)', () => {
        const { component, fixture } = setup(true);
        expect(fixture.nativeElement.querySelector('app-tag-input')).toBeNull();
        component.submit();
        http.expectOne(`${environment.apiUrl}/public/files`).flush({});
    });

    it('refuses files over 1 GB before calling the API (US01)', () => {
        const big = new File(['x'], 'film.mp4');
        Object.defineProperty(big, 'size', { value: 1_073_741_825 });
        const { component, fixture } = setup(false, big);
        expect(fixture.nativeElement.textContent).toContain('La taille des fichiers est limitée à 1 Go');
        expect(component.canSubmit()).toBe(false);
        component.submit();
        http.expectNone(`${environment.apiUrl}/files`);
    });

    it('refuses blocked extensions (US01)', () => {
        const { component } = setup(false, new File(['MZ'], 'virus.EXE'));
        expect(component.fileProblem()).toContain('.exe');
    });

    it('shows the share link after upload', () => {
        const { component, fixture } = setup();
        component.submit();
        http.expectOne(`${environment.apiUrl}/files`).flush({
            id: 1, publicToken: 'abc-123', originalName: 'hello.txt', mimeType: 'text/plain', sizeBytes: 5,
            uploadedAt: '', expiresAt: '', passwordProtected: false, expired: false, downloadUrl: '', tags: [],
        });
        fixture.detectChanges();
        const text: string = fixture.nativeElement.textContent;
        expect(text).toContain('Félicitations');
        expect(text).toContain('une semaine');
        expect(fixture.nativeElement.querySelector('.share-link').getAttribute('href')).toContain('/d/abc-123');
    });
});
