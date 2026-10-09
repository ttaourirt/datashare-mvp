import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HistoryComponent } from './history.component';
import { FileResponse } from '../../core/api/file.api';
import { environment } from '../../../environments/environment';

function file(id: number, name: string, expired: boolean, tags: string[] = []): FileResponse {
    return {
        id,
        publicToken: `token-${id}`,
        originalName: name,
        mimeType: 'text/plain',
        sizeBytes: 2048,
        uploadedAt: '2026-10-01T10:00:00Z',
        expiresAt: expired ? '2026-10-02T10:00:00Z' : '2099-01-01T10:00:00Z',
        passwordProtected: false,
        expired,
        downloadUrl: `/d/token-${id}`,
        tags: tags.map((t, i) => ({ id: id * 10 + i, name: t })),
    };
}

describe('HistoryComponent', () => {
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
        });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    function setup(files: FileResponse[]) {
        const fixture = TestBed.createComponent(HistoryComponent);
        http.expectOne(`${environment.apiUrl}/files?includeExpired=true`).flush(files);
        fixture.detectChanges();
        return fixture;
    }

    const names = (el: HTMLElement) => Array.from(el.querySelectorAll('.file-name > span:first-child')).map(e => e.textContent?.trim());

    it('shows only non-expired files by default (US06)', () => {
        const fixture = setup([file(1, 'actif.txt', false), file(2, 'vieux.txt', true)]);
        expect(names(fixture.nativeElement)).toEqual(['actif.txt']);
    });

    it('shows upload and expiration dates, size and status (US05)', () => {
        const fixture = setup([file(1, 'actif.txt', false)]);
        const sub: string = fixture.nativeElement.querySelector('.file-sub').textContent;
        expect(sub).toContain('Envoyé le');
        expect(sub).toContain('Expire le');
        expect(sub).toContain('2.0 KB');
    });

    it('filters by tag (US08)', () => {
        const fixture = setup([file(1, 'a.txt', false, ['projet']), file(2, 'b.txt', false, ['perso'])]);
        const select: HTMLSelectElement = fixture.nativeElement.querySelector('.tag-filter select');
        select.value = 'perso';
        select.dispatchEvent(new Event('change'));
        fixture.detectChanges();
        expect(names(fixture.nativeElement)).toEqual(['b.txt']);
    });

    it('asks for confirmation before deleting (US06)', () => {
        const fixture = setup([file(1, 'a.txt', false)]);
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const del = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
            .find(b => b.textContent?.includes('Supprimer'))!;
        del.click();
        expect(window.confirm).toHaveBeenCalled();
        http.expectNone(`${environment.apiUrl}/files/1`);
    });

    it('saves edited tags (US08)', () => {
        const fixture = setup([file(1, 'a.txt', false, ['projet'])]);
        const component = fixture.componentInstance as unknown as {
            startEditTags(f: FileResponse): void;
            editTags: {
                set(v: string[]): void;
            };
            saveTags(f: FileResponse): void;
        };
        const f = file(1, 'a.txt', false, ['projet']);
        component.startEditTags(f);
        component.editTags.set(['client']);
        component.saveTags(f);
        const req = http.expectOne(`${environment.apiUrl}/files/1/tags`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ tags: ['client'] });
        req.flush(file(1, 'a.txt', false, ['client']));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.file-tags').textContent).toContain('client');
    });
});
