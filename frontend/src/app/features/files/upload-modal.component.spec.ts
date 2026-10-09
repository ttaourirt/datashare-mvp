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

    function setup(anonymous = false) {
        const fixture = TestBed.createComponent(UploadModalComponent);
        fixture.componentRef.setInput('anonymous', anonymous);
        fixture.detectChanges();
        const component = fixture.componentInstance;
        component.file.set(new File(['hello'], 'hello.txt', { type: 'text/plain' }));
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
});
