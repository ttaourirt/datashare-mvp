import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FileApi, PublicFileMeta } from '../../core/api/file.api';
import { formatBytes, saveBlob } from '../../shared/format';

@Component({
  selector: 'app-download',
  standalone: true,
  imports: [CommonModule, DatePipe, ReactiveFormsModule],
  template: `
    <div class="card">
      <h1>Télécharger un fichier</h1>

      @if (loading()) { <p>Chargement...</p> }
      @if (error()) { <div class="error">{{ error() }}</div> }

      @if (meta(); as m) {
        <p><strong>{{ m.originalName }}</strong></p>
        <p>{{ humanSize(m.sizeBytes) }} · {{ m.mimeType }}</p>
        <p>Expire le {{ m.expiresAt | date:'medium' }}</p>

        <form [formGroup]="form" (ngSubmit)="download()">
          @if (m.passwordProtected) {
            <label class="field">
              <span>Mot de passe</span>
              <input type="password" formControlName="password" required />
            </label>
          }
          <button type="submit" class="primary" [disabled]="downloading() || (m.passwordProtected && form.invalid)">
            {{ downloading() ? 'Téléchargement...' : 'Télécharger' }}
          </button>
        </form>
      }
    </div>
  `,
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
        this.error.set(err.status === 410 ? 'Le lien a expiré.'
                        : err.status === 404 ? 'Lien invalide.'
                        : 'Erreur lors de la lecture du lien.');
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
