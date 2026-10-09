import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FileApi, PublicFileMeta } from '../../core/api/file.api';
import { daysUntil, formatBytes, saveBlob } from '../../shared/format';
import { PublicLayoutComponent } from '../../shared/public-layout.component';
import { IconComponent } from '../../shared/icon.component';

/** US02 — page publique de téléchargement (maquettes « Téléchargement »). */
@Component({
  selector: 'app-download',
  imports: [ReactiveFormsModule, PublicLayoutComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-public-layout>
      <section class="card dl-card" aria-labelledby="dl-title" aria-live="polite">
        <h1 class="card-title" id="dl-title">Télécharger un fichier</h1>

        @if (loading()) { <p class="text-mut center">Chargement…</p> }

        @if (linkError()) {
          <div class="callout callout--error" role="alert">
            <app-icon name="error" [size]="12" /> {{ linkError() }}
          </div>
        }

        @if (meta(); as m) {
          <div class="file-line">
            <app-icon class="file-line__icon" name="file" [size]="18" />
            <div class="file-line__meta">
              <div class="file-line__name" [title]="m.originalName">{{ m.originalName }}</div>
              <div class="file-line__size">{{ humanSize(m.sizeBytes) }}</div>
            </div>
          </div>

          @if (daysLeft() <= 1) {
            <div class="callout callout--warning">
              <app-icon name="warning" [size]="12" /> {{ expiryText() }}
            </div>
          } @else {
            <div class="callout callout--info">
              <app-icon name="info" [size]="12" /> {{ expiryText() }}
            </div>
          }

          @if (downloadError()) {
            <div class="callout callout--error" role="alert">
              <app-icon name="error" [size]="12" /> {{ downloadError() }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="download()">
            @if (m.passwordProtected) {
              <div class="field">
                <label class="field-label" for="dl-password">Mot de passe</label>
                <input id="dl-password" type="password" formControlName="password" required
                       autocomplete="off" placeholder="Saisissez le mot de passe..." />
              </div>
            }
            <button type="submit" class="btn btn--primary btn--block"
                    [disabled]="downloading() || (m.passwordProtected && form.invalid)">
              <app-icon name="download" [size]="12" /> {{ downloading() ? 'Téléchargement…' : 'Télécharger' }}
            </button>
          </form>
        }
      </section>
    </app-public-layout>
  `,
  styles: [`
    .dl-card { max-width: 640px; }
    .center { text-align: center; }
  `],
})
export class DownloadComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(FileApi);
  private readonly fb = inject(FormBuilder);

  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';

  readonly meta = signal<PublicFileMeta | null>(null);
  readonly loading = signal(true);
  readonly downloading = signal(false);
  readonly linkError = signal<string | null>(null);
  readonly downloadError = signal<string | null>(null);

  readonly daysLeft = computed(() => {
    const m = this.meta();
    return m ? daysUntil(m.expiresAt) : 0;
  });
  readonly expiryText = computed(() => {
    const d = this.daysLeft();
    if (d === 0) return "Ce fichier expirera aujourd'hui.";
    if (d === 1) return 'Ce fichier expirera demain.';
    return `Ce fichier expirera dans ${d} jours.`;
  });

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required]],
  });

  constructor() {
    this.api.publicMeta(this.token).subscribe({
      next: m => { this.meta.set(m); this.loading.set(false); },
      error: err => {
        this.linkError.set(
          err.status === 410 ? "Ce fichier n'est plus disponible en téléchargement car il a expiré."
            : err.status === 404 ? 'Ce lien est invalide ou le fichier a été supprimé.'
              : 'Impossible de lire ce lien pour le moment.'
        );
        this.loading.set(false);
      },
    });
  }

  download(): void {
    this.downloading.set(true);
    this.downloadError.set(null);
    const password = this.meta()?.passwordProtected ? this.form.getRawValue().password : undefined;
    this.api.publicDownload(this.token, password).subscribe({
      next: blob => {
        saveBlob(blob, this.meta()!.originalName);
        this.downloading.set(false);
      },
      error: err => {
        this.downloadError.set(err.status === 403 ? 'Mot de passe invalide.' : 'Téléchargement impossible.');
        this.downloading.set(false);
      },
    });
  }

  humanSize = formatBytes;
}
