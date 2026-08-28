import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FileApi, FileResponse } from '../../core/api/file.api';
import { formatBytes } from '../../shared/format';

@Component({
  selector: 'app-anonymous-upload',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="card" style="max-width: 500px;">
      <h1>Envoyer un fichier sans compte</h1>
      <p style="color:#6b7280; font-size: 14px;">
        Vous n'aurez pas d'historique. Notez bien le lien qui apparaîtra après l'envoi.
      </p>

      @if (error()) { <div class="error">{{ error() }}</div> }

      @if (!result()) {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label class="field">
            <span>Fichier (max 1 GB)</span>
            <input type="file" (change)="onFile($event)" required />
          </label>
          <label class="field">
            <span>Expiration (jours, 1 à 7)</span>
            <input type="number" formControlName="expiresInDays" min="1" max="7" />
          </label>
          <label class="field">
            <span>Mot de passe (facultatif, min. 6 caractères)</span>
            <input type="password" formControlName="password" minlength="6" />
          </label>
          <button type="submit" class="primary" [disabled]="!file() || uploading()">
            {{ uploading() ? 'Envoi...' : 'Envoyer' }}
          </button>
        </form>
      } @else {
        <div style="padding: 12px; background: #ecfdf5; border-radius: 6px;">
          <p><strong>Envoyé !</strong> {{ humanSize(result()!.sizeBytes) }}</p>
          <p style="word-break: break-all;">
            Lien à partager :<br />
            <a [href]="publicUrl(result()!)">{{ publicUrl(result()!) }}</a>
          </p>
          <button (click)="copyLink()">Copier le lien</button>
        </div>
      }
    </div>
  `,
})
export class AnonymousUploadComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(FileApi);

  readonly file = signal<File | null>(null);
  readonly result = signal<FileResponse | null>(null);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    expiresInDays: [7, [Validators.required, Validators.min(1), Validators.max(7)]],
    password: [''],
  });

  onFile(ev: Event): void {
    this.file.set((ev.target as HTMLInputElement).files?.[0] ?? null);
  }

  submit(): void {
    const f = this.file();
    if (!f) return;
    this.uploading.set(true);
    this.error.set(null);
    const { expiresInDays, password } = this.form.getRawValue();
    this.api.uploadAnonymous(f, {
      expiresInDays,
      password: password || undefined,
    }).subscribe({
      next: r => { this.result.set(r); this.uploading.set(false); },
      error: err => {
        this.error.set(err?.error?.message ?? "Erreur lors de l'envoi.");
        this.uploading.set(false);
      },
    });
  }

  publicUrl(r: FileResponse): string {
    return `${window.location.origin}/d/${r.publicToken}`;
  }

  copyLink(): void {
    const r = this.result();
    if (r) navigator.clipboard.writeText(this.publicUrl(r));
  }

  humanSize = formatBytes;
}
