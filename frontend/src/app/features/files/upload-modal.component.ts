import { Component, ChangeDetectionStrategy, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FileApi, FileResponse } from '../../core/api/file.api';
import { TagInputComponent } from '../../shared/tag-input.component';
import { IconComponent } from '../../shared/icon.component';
import { formatBytes } from '../../shared/format';
import { EXPIRATION_OPTIONS, MIN_FILE_PASSWORD, durationLabel, fileError } from './upload-rules';

/** Modale « Ajouter un fichier » (US01 / US07 / US08 / US09 / US10) — bottom sheet sur mobile. */
@Component({
  selector: 'app-upload-modal',
  imports: [ReactiveFormsModule, TagInputComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close.emit()' },
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="upload-title"
           (click)="$event.stopPropagation()">
        <div class="card">
          <button type="button" class="modal-close" aria-label="Fermer" (click)="close.emit()">
            <app-icon name="close" [size]="16" />
          </button>
          <h2 class="card-title" id="upload-title">Ajouter un fichier</h2>

          @if (result(); as r) {
            <!-- État « Félicitations » -->
            <div class="file-line">
              <app-icon class="file-line__icon" name="file" [size]="18" />
              <div class="file-line__meta">
                <div class="file-line__name">{{ r.originalName }}</div>
                <div class="file-line__size">{{ humanSize(r.sizeBytes) }}</div>
              </div>
            </div>
            <p class="done-text">
              Félicitations, ton fichier sera conservé chez nous pendant {{ keptFor() }} !
            </p>
            <div class="share-box">
              <a class="share-link" [href]="shareUrl()" target="_blank" rel="noopener">{{ shareUrl() }}</a>
            </div>
            <div class="modal-action">
              <button type="button" class="btn btn--primary" (click)="copyLink()">
                <app-icon name="copy" [size]="12" /> {{ copied() ? 'Lien copié !' : 'Copier le lien' }}
              </button>
            </div>
            <p class="sr-only" aria-live="polite">{{ copied() ? 'Lien copié dans le presse-papiers' : '' }}</p>
          } @else {
            @if (error()) {
              <div class="callout callout--error" role="alert">
                <app-icon name="error" [size]="12" /> {{ error() }}
              </div>
            }

            <form [formGroup]="form" (ngSubmit)="submit()">
              @if (file(); as f) {
                <div class="file-line file-line--picked">
                  <app-icon class="file-line__icon" name="file" [size]="18" />
                  <div class="file-line__meta">
                    <div class="file-line__name" [title]="f.name">{{ f.name }}</div>
                    <div class="file-line__size" [class.file-line__size--error]="fileProblem()">{{ humanSize(f.size) }}</div>
                  </div>
                  <label class="btn btn--outline btn--xs">
                    Changer
                    <input class="sr-only" type="file" (change)="onFile($event)" />
                  </label>
                </div>
                @if (fileProblem()) {
                  <p class="field-error file-error" role="alert">{{ fileProblem() }}</p>
                }
              } @else {
                <label class="btn btn--outline btn--block pick">
                  <app-icon name="upload" [size]="12" /> Choisir un fichier
                  <input class="sr-only" type="file" (change)="onFile($event)" />
                </label>
              }

              <div class="field">
                <label class="field-label" for="upload-password">Mot de passe</label>
                <input id="upload-password" type="password" formControlName="password" placeholder="Optionnel"
                       autocomplete="new-password"
                       [attr.aria-invalid]="passwordTooShort() ? true : null"
                       [attr.aria-describedby]="passwordTooShort() ? 'upload-password-error' : null" />
                @if (passwordTooShort()) {
                  <p class="field-error" role="alert" id="upload-password-error">
                    Le mot de passe doit contenir au moins 6 caractères.
                  </p>
                }
              </div>

              <div class="field">
                <label class="field-label" for="upload-expiration">Expiration</label>
                <select id="upload-expiration" formControlName="expiresInDays">
                  @for (o of expirationOptions; track o.days) {
                    <option [ngValue]="o.days">{{ o.label }}</option>
                  }
                </select>
              </div>

              @if (!anonymous()) {
                <app-tag-input inputId="upload-tags" [(tags)]="tags" />
              }

              <div class="modal-action">
                <button type="submit" class="btn btn--primary" [disabled]="!canSubmit()">
                  <app-icon name="upload" [size]="12" /> {{ uploading() ? 'Envoi…' : 'Téléverser' }}
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .file-line--picked { margin-bottom: 4px; }
    .file-error { margin: 0 0 14px; }
    .file-line--picked + .field { margin-top: 14px; }
    .pick { margin-bottom: 14px; cursor: pointer; }
    label.btn { cursor: pointer; }
    .done-text { font-size: 12px; margin: 0 0 10px; }
    .share-box {
      background: var(--bg-muted);
      border-radius: var(--r-xs);
      padding: 8px 10px;
      margin-bottom: 14px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .share-link { color: var(--orange); font-size: 12px; }
    .modal-action { display: flex; justify-content: center; }
    @media (max-width: 600px) {
      .modal-action .btn { width: 100%; }
    }
  `],
})
export class UploadModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(FileApi);

  readonly anonymous = input(false);
  readonly initialFile = input<File | null>(null);
  readonly close = output<void>();
  readonly uploaded = output<FileResponse>();

  readonly expirationOptions = EXPIRATION_OPTIONS;
  private readonly picked = signal<File | null>(null);
  readonly file = computed(() => this.picked() ?? this.initialFile());
  readonly fileProblem = computed(() => {
    const f = this.file();
    return f ? fileError(f) : null;
  });
  readonly tags = signal<string[]>([]);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<FileResponse | null>(null);
  readonly copied = signal(false);
  private readonly invalidForm = signal(false);

  readonly form = this.fb.nonNullable.group({
    // US10 — 7 jours par défaut, 1 à 7 jours
    expiresInDays: [7, [Validators.required, Validators.min(1), Validators.max(7)]],
    password: ['', [Validators.minLength(MIN_FILE_PASSWORD)]],
  });

  constructor() {
    this.form.statusChanges.subscribe(s => this.invalidForm.set(s === 'INVALID'));
  }

  readonly canSubmit = computed(() =>
    !!this.file() && !this.fileProblem() && !this.invalidForm() && !this.uploading());

  keptFor(): string {
    return durationLabel(this.form.getRawValue().expiresInDays);
  }

  passwordTooShort(): boolean {
    const ctrl = this.form.controls.password;
    return ctrl.dirty && ctrl.hasError('minlength');
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (f) {
      this.picked.set(f);
      this.error.set(null);
    }
  }

  submit(): void {
    const f = this.file();
    if (!f || this.fileProblem() || this.form.invalid) return;
    this.uploading.set(true);
    this.error.set(null);

    const { expiresInDays, password } = this.form.getRawValue();
    const opts = { expiresInDays, password: password || undefined, tags: this.tags() };
    const req = this.anonymous()
      ? this.api.uploadAnonymous(f, opts)
      : this.api.upload(f, opts);

    req.subscribe({
      next: r => {
        this.uploading.set(false);
        this.result.set(r);
        this.uploaded.emit(r);
      },
      error: err => {
        this.error.set(err?.error?.message ?? "Erreur lors de l'envoi du fichier.");
        this.uploading.set(false);
      },
    });
  }

  shareUrl(): string {
    const r = this.result();
    return r ? `${window.location.origin}/d/${r.publicToken}` : '';
  }

  copyLink(): void {
    navigator.clipboard?.writeText(this.shareUrl()).then(() => this.copied.set(true), () => this.copied.set(false));
  }

  humanSize = formatBytes;
}
