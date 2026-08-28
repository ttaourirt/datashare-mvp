import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FileApi, FileResponse, TagResponse } from '../../core/api/file.api';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 24px;">
      <h3>Uploader un fichier</h3>
      @if (error()) { <div class="error">{{ error() }}</div> }
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
        <input type="password" formControlName="password" minlength="6" autocomplete="new-password" />
      </label>
      @if (tags().length > 0) {
        <label class="field">
          <span>Tags</span>
          <select multiple size="4" formControlName="tagIds" style="width:100%;">
            @for (t of tags(); track t.id) {
              <option [value]="t.id">{{ t.name }}</option>
            }
          </select>
        </label>
      }
      <button type="submit" class="primary" [disabled]="!file() || uploading()">
        {{ uploading() ? 'Envoi...' : 'Envoyer' }}
      </button>
    </form>
  `,
})
export class UploadComponent {
  private readonly fb = inject(FormBuilder);
  private readonly fileApi = inject(FileApi);

  readonly tags = signal<TagResponse[]>([]);
  readonly file = signal<File | null>(null);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    expiresInDays: [7, [Validators.required, Validators.min(1), Validators.max(7)]],
    password: [''],
    tagIds: [[] as number[]],
  });

  readonly uploaded = output<FileResponse>();

  setTags(t: TagResponse[]): void {
    this.tags.set(t);
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  submit(): void {
    const f = this.file();
    if (!f) return;
    this.uploading.set(true);
    this.error.set(null);
    const { expiresInDays, password, tagIds } = this.form.getRawValue();
    this.fileApi.upload(f, {
      expiresInDays,
      password: password || undefined,
      tagIds: tagIds && tagIds.length ? tagIds : undefined,
    }).subscribe({
      next: r => {
        this.uploaded.emit(r);
        this.file.set(null);
        this.form.reset({ expiresInDays: 7, password: '', tagIds: [] });
        this.uploading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? "Erreur lors de l'upload");
        this.uploading.set(false);
      },
    });
  }
}
