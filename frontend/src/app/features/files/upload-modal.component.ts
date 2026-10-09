import { Component, inject, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FileApi, FileResponse } from '../../core/api/file.api';
import { TagInputComponent } from '../../shared/tag-input.component';

@Component({
    selector: 'app-upload-modal',
    imports: [ReactiveFormsModule, TagInputComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal" style="position: relative;" (click)="$event.stopPropagation()">
        <button class="modal-close" aria-label="Fermer" (click)="close.emit()">×</button>
        <h2>Envoyer un fichier</h2>
        <p class="text-mut" style="margin: 0 0 16px; font-size: 14px;">
          @if (anonymous()) {
            Envoi anonyme — pense à noter le lien après.
          } @else {
            Le fichier sera lié à ton compte.
          }
        </p>

        @if (error()) { <div class="error-banner">{{ error() }}</div> }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <label class="field">
            <span>Fichier (max 1 GB)</span>
            <input type="file" (change)="onFile($event)" required />
          </label>

          <label class="field">
            <span>Expiration (1 à 7 jours)</span>
            <input type="number" formControlName="expiresInDays" min="1" max="7" />
          </label>

          <label class="field">
            <span>Mot de passe (facultatif, min. 6 caractères)</span>
            <input type="password" formControlName="password" autocomplete="new-password"
                   [attr.aria-invalid]="passwordTooShort() ? true : null"
                   [attr.aria-describedby]="passwordTooShort() ? 'upload-password-error' : null" />
            @if (passwordTooShort()) {
              <p class="field-error" role="alert" id="upload-password-error">
                Le mot de passe doit contenir au moins 6 caractères.
              </p>
            }
          </label>

          @if (!anonymous()) {
            <app-tag-input inputId="upload-tags" [(tags)]="tags" />
          }

          <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px;">
            <button type="button" class="btn btn--ghost" (click)="close.emit()">Annuler</button>
            <button type="submit" class="btn btn--coral" [disabled]="!file() || form.invalid || uploading()">
              {{ uploading() ? 'Envoi…' : 'Envoyer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class UploadModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(FileApi);

  readonly anonymous = input(false);
  readonly close = output<void>();
  readonly uploaded = output<FileResponse>();

  readonly file = signal<File | null>(null);
  readonly tags = signal<string[]>([]);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    expiresInDays: [7, [Validators.required, Validators.min(1), Validators.max(7)]],
    password: ['', [Validators.minLength(6)]],
  });

  passwordTooShort(): boolean {
    const ctrl = this.form.controls.password;
    return ctrl.dirty && ctrl.hasError('minlength');
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  submit(): void {
    const f = this.file();
    if (!f || this.form.invalid) return;
    this.uploading.set(true);
    this.error.set(null);

    const { expiresInDays, password } = this.form.getRawValue();
    const opts = { expiresInDays, password: password || undefined, tags: this.tags() };
    const req = this.anonymous()
      ? this.api.uploadAnonymous(f, opts)
      : this.api.upload(f, opts);

    req.subscribe({
      next: r => { this.uploading.set(false); this.uploaded.emit(r); },
      error: err => {
        this.error.set(err?.error?.message ?? "Erreur lors de l'upload.");
        this.uploading.set(false);
      },
    });
  }
}
