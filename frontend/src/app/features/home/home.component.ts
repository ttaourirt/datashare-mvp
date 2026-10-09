import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { UploadModalComponent } from '../files/upload-modal.component';
import { FileResponse } from '../../core/api/file.api';

@Component({
    selector: 'app-home',
    imports: [RouterLink, UploadModalComponent],
    template: `
    <div class="landing gradient-coral">
      <header class="landing-header">
        <a class="logo" routerLink="/">DataShare</a>

        @if (auth.user()) {
          <a class="btn btn--dark" routerLink="/files">Mon espace</a>
        } @else {
          <a class="btn btn--dark" routerLink="/login">Se connecter</a>
        }
      </header>

      <section class="hero">
        <h1>Tu veux partager un fichier ?</h1>

        <button
          class="btn btn--icon-round"
          aria-label="Envoyer un fichier"
          (click)="openUpload()">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
            <polyline points="12 12 12 21"/>
            <polyline points="16 16 12 12 8 16"/>
          </svg>
        </button>
      </section>

      <footer class="landing-footer">
        <p class="copyright">Copyright DataShare® 2025</p>
      </footer>
    </div>

    @if (result()) {
      <div class="modal-backdrop" (click)="clearResult()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Envoyé !</h2>
          <p class="text-mut">Partage ce lien avec ton destinataire.</p>
          <div class="link-box">
            <input class="input mono" [value]="publicUrl(result()!)" readonly #linkInput />
            <button class="btn btn--dark btn--sm" (click)="copyLink(linkInput)">Copier</button>
          </div>
          <div style="display:flex; justify-content:flex-end; margin-top: 16px;">
            <button class="btn btn--ghost" (click)="clearResult()">Fermer</button>
          </div>
        </div>
      </div>
    }

    @if (uploadOpen()) {
      <app-upload-modal
        [anonymous]="!auth.user()"
        (close)="closeUpload()"
        (uploaded)="onUploaded($event)" />
    }
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    .landing {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .landing-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 32px;
    }
    .hero {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 40px;
      text-align: center;
      padding: 20px;
    }
    h1 {
      font-family: 'Instrument Serif', Georgia, serif;
      font-weight: 400;
      font-size: 32px;
      margin: 0;
      color: var(--text);
    }
    .landing-footer { padding: 8px 32px 24px; }
    .link-box { display: flex; gap: 8px; margin-top: 12px; }
    @media (min-width: 720px) {
      h1 { font-size: 40px; }
    }
  `]
})
export class HomeComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly uploadOpen = signal(false);
  readonly result = signal<FileResponse | null>(null);

  openUpload(): void { this.uploadOpen.set(true); }
  closeUpload(): void { this.uploadOpen.set(false); }

  onUploaded(f: FileResponse): void {
    this.uploadOpen.set(false);
    if (this.auth.user()) {
      this.router.navigateByUrl('/files');
    } else {
      this.result.set(f);
    }
  }

  clearResult(): void { this.result.set(null); }

  publicUrl(r: FileResponse): string {
    return `${window.location.origin}/d/${r.publicToken}`;
  }

  copyLink(input: HTMLInputElement): void {
    input.select();
    navigator.clipboard.writeText(input.value);
  }
}
