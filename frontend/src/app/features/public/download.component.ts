import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FileApi, PublicFileMeta } from '../../core/api/file.api';
import { formatBytes, saveBlob } from '../../shared/format';

@Component({
    selector: 'app-download',
    imports: [CommonModule, DatePipe, ReactiveFormsModule, RouterLink],
    template: `
    <div class="dl-page gradient-coral">
      <header class="dl-header">
        <a class="logo" routerLink="/">DataShare</a>
      </header>

      <section class="dl-body">
        <div class="card dl-card">
          <h1>Télécharger un fichier</h1>

          @if (loading()) { <p class="text-mut">Chargement…</p> }
          @if (error()) { <div class="error-banner">{{ error() }}</div> }

          @if (meta(); as m) {
            <div class="file-summary">
              <div class="file-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="1.6"
                     stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div>
                <div style="font-weight: 500;">{{ m.originalName }}</div>
                <div class="text-mut" style="font-size: 12px;">
                  {{ humanSize(m.sizeBytes) }} · expire le {{ m.expiresAt | date:'medium' }}
                </div>
              </div>
            </div>

            <form [formGroup]="form" (ngSubmit)="download()">
              @if (m.passwordProtected) {
                <label class="field">
                  <span>Mot de passe requis</span>
                  <input type="password" formControlName="password" required autocomplete="current-password" />
                </label>
              }
              <button
                type="submit"
                class="btn btn--coral"
                style="width:100%; margin-top:8px;"
                [disabled]="downloading() || (m.passwordProtected && form.invalid)">
                {{ downloading() ? 'Téléchargement…' : 'Télécharger' }}
              </button>
            </form>
          }
        </div>
      </section>

      <footer class="dl-footer">
        <p class="copyright">Copyright DataShare® 2025</p>
      </footer>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    .dl-page { min-height: 100vh; display: flex; flex-direction: column; }
    .dl-header { padding: 24px 32px; }
    .dl-body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .dl-card { width: 100%; max-width: 440px; }
    .dl-card h1 {
      font-family: 'Instrument Serif', Georgia, serif;
      font-weight: 400;
      font-size: 26px;
      margin: 0 0 16px;
    }
    .file-summary {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 12px;
      background: var(--bg-muted);
      border-radius: var(--r-md);
      margin-bottom: 16px;
    }
    .file-icon {
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      background: white;
      border-radius: var(--r-sm);
    }
    .dl-footer { padding: 8px 32px 24px; }
  `]
})
export class DownloadComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(FileApi);
  private readonly fb = inject(FormBuilder);

  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';

  readonly meta = signal<PublicFileMeta | null>(null);
  readonly loading = signal(true);
  readonly downloading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required]],
  });

  constructor() {
    this.api.publicMeta(this.token).subscribe({
      next: m => { this.meta.set(m); this.loading.set(false); },
      error: err => {
        this.error.set(
          err.status === 410 ? 'Ce lien a expiré.'
            : err.status === 404 ? 'Lien invalide ou introuvable.'
              : 'Erreur lors de la lecture du lien.'
        );
        this.loading.set(false);
      },
    });
  }

  download(): void {
    this.downloading.set(true);
    this.error.set(null);
    const password = this.meta()?.passwordProtected ? this.form.getRawValue().password : undefined;
    this.api.publicDownload(this.token, password).subscribe({
      next: blob => {
        saveBlob(blob, this.meta()!.originalName);
        this.downloading.set(false);
      },
      error: err => {
        this.error.set(err.status === 403 ? 'Mot de passe invalide.' : 'Téléchargement impossible.');
        this.downloading.set(false);
      },
    });
  }

  humanSize = formatBytes;
}
