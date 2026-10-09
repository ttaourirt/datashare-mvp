import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { FileApi, FileResponse } from '../../core/api/file.api';
import { UploadModalComponent } from './upload-modal.component';
import { formatBytes } from '../../shared/format';
import { TagInputComponent } from '../../shared/tag-input.component';

type Filter = 'all' | 'active' | 'expired';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, DatePipe, UploadModalComponent, TagInputComponent],
  template: `
    <div class="history">
      <h1>Mes fichiers</h1>

      <div class="tabs" role="tablist">
        <button
          role="tab"
          [class.active]="filter() === 'all'"
          [attr.aria-selected]="filter() === 'all'"
          (click)="filter.set('all')">Tout</button>
        <button
          role="tab"
          [class.active]="filter() === 'active'"
          [attr.aria-selected]="filter() === 'active'"
          (click)="filter.set('active')">Actifs</button>
        <button
          role="tab"
          [class.active]="filter() === 'expired'"
          [attr.aria-selected]="filter() === 'expired'"
          (click)="filter.set('expired')">Expiré</button>
      </div>

      @if (allTags().length > 0) {
        <label class="tag-filter">
          <span>Filtrer par tag</span>
          <select class="input" [value]="tagFilter() ?? ''" (change)="setTagFilter($any($event.target).value)">
            <option value="">Tous les tags</option>
            @for (t of allTags(); track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
        </label>
      }

      <div class="files-card">
        @if (loading()) {
          <p class="text-mut">Chargement…</p>
        } @else if (filtered().length === 0) {
          <p class="text-mut">Aucun fichier {{ filter() === 'expired' ? 'expiré' : filter() === 'active' ? 'actif' : '' }} pour le moment.</p>
        } @else {
          <ul class="files-list">
            @for (f of filtered(); track f.id) {
              <li class="file-row">
                <div class="file-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="1.8"
                       stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>

                <div class="file-meta">
                  <div class="file-name">
                    <span>{{ f.originalName }}</span>
                    @if (f.passwordProtected) {
                      <span class="lock" title="Protégé par mot de passe">🔒</span>
                    }
                  </div>
                  <div class="file-sub text-mut">
                    {{ statusLabel(f) }} · {{ humanSize(f.sizeBytes) }}
                    · Envoyé le {{ f.uploadedAt | date:'dd/MM/yyyy HH:mm' }}
                    · Expire le {{ f.expiresAt | date:'dd/MM/yyyy HH:mm' }}
                  </div>
                  @if (f.tags.length > 0) {
                    <div class="file-tags">
                      @for (t of f.tags; track t.id) { <span class="tag-chip">{{ t.name }}</span> }
                    </div>
                  }
                </div>

                <div class="file-actions">
                  @if (!f.expired) {
                    <button class="btn btn--ghost btn--sm" (click)="startEditTags(f)"
                            [attr.aria-expanded]="editingId() === f.id">Tags</button>
                    <button class="btn btn--danger btn--sm" (click)="remove(f)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" stroke-width="2"
                           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                      Supprimer
                    </button>
                    <a class="btn btn--dark btn--sm" [href]="publicPath(f)" target="_blank">Accéder →</a>
                  } @else {
                    <span class="expired-msg text-mut">Ce fichier a expiré, il n'est plus stocké chez vous.</span>
                  }
                </div>

                @if (editingId() === f.id) {
                  <div class="tags-editor">
                    <app-tag-input [inputId]="'tags-' + f.id" label="Tags du fichier" [(tags)]="editTags" />
                    <div class="tags-editor__actions">
                      <button class="btn btn--ghost btn--sm" (click)="editingId.set(null)">Annuler</button>
                      <button class="btn btn--dark btn--sm" (click)="saveTags(f)">Enregistrer</button>
                    </div>
                  </div>
                }
              </li>
            }
          </ul>
        }
      </div>

      @if (uploadOpen()) {
        <app-upload-modal (close)="uploadOpen.set(false)" (uploaded)="onUploaded($event)" />
      }
    </div>
  `,
  styles: [`
    .history { max-width: 1000px; margin: 0 auto; }
    h1 {
      font-family: 'Instrument Serif', Georgia, serif;
      font-weight: 400;
      font-size: 30px;
      margin: 8px 0 20px;
    }
    .tabs { margin-bottom: 16px; }
    .files-card {
      background: var(--bg-card);
      border-radius: var(--r-lg);
      padding: 8px 4px;
      box-shadow: var(--sh-1);
    }
    .files-list { list-style: none; margin: 0; padding: 0; }
    .file-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
    }
    .file-row:last-child { border-bottom: none; }
    .file-icon {
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      background: var(--bg-muted);
      border-radius: var(--r-sm);
      color: var(--text);
      flex-shrink: 0;
    }
    .file-meta { flex: 1 1 0; min-width: 0; }
    .file-name {
      display: flex; align-items: center; gap: 8px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lock { font-size: 12px; }
    .file-sub { font-size: 12px; margin-top: 2px; }
    .file-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
    }
    .expired-msg { font-size: 12px; text-align: right; }
    .file-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .tag-filter { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-size: 13px; font-weight: 500; }
    .tag-filter select { width: auto; min-width: 180px; padding: 6px 12px; }
    .tags-editor { flex-basis: 100%; padding: 4px 0 0 50px; }
    .tags-editor__actions { display: flex; justify-content: flex-end; gap: 8px; }
    @media (max-width: 700px) {
      .tags-editor { padding-left: 0; }
      .file-actions { width: 100%; justify-content: flex-end; }
    }
  `],
})
export class HistoryComponent {
  private readonly api = inject(FileApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly files = signal<FileResponse[]>([]);
  protected readonly loading = signal(true);
  // US06 — seuls les fichiers non expirés sont affichés par défaut
  protected readonly filter = signal<Filter>('active');
  protected readonly tagFilter = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);
  protected readonly editTags = signal<string[]>([]);
  protected readonly uploadOpen = signal(false);

  protected readonly filtered = computed(() => {
    const all = this.files();
    const f = this.filter();
    const tag = this.tagFilter();
    return all
      .filter(x => f === 'all' || (f === 'active' ? !x.expired : x.expired))
      .filter(x => !tag || x.tags.some(t => t.name === tag));
  });

  protected readonly allTags = computed(() =>
    [...new Set(this.files().flatMap(f => f.tags.map(t => t.name)))].sort((a, b) => a.localeCompare(b)));

  constructor() {
    // Ouvrir le modal quand la topbar clique "Ajouter des fichiers"
    fromEvent(window, 'datashare:open-upload')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.uploadOpen.set(true));
    this.refresh();
  }

  onUploaded(_: FileResponse): void {
    this.uploadOpen.set(false);
    this.refresh();
  }

  remove(f: FileResponse): void {
    if (!confirm(`Supprimer "${f.originalName}" ? Action irréversible.`)) return;
    this.api.remove(f.id).subscribe(() => this.refresh());
  }

  setTagFilter(value: string): void {
    this.tagFilter.set(value || null);
  }

  startEditTags(f: FileResponse): void {
    this.editTags.set(f.tags.map(t => t.name));
    this.editingId.set(f.id);
  }

  saveTags(f: FileResponse): void {
    this.api.updateTags(f.id, this.editTags()).subscribe(updated => {
      this.files.update(list => list.map(x => (x.id === updated.id ? updated : x)));
      this.editingId.set(null);
    });
  }

  humanSize = formatBytes;

  publicPath(f: FileResponse): string {
    return `/d/${f.publicToken}`;
  }

  statusLabel(f: FileResponse): string {
    if (f.expired) return 'Expiré';
    const d = new Date(f.expiresAt).getTime();
    const now = Date.now();
    const days = Math.ceil((d - now) / 86400000);
    if (days <= 0) return 'Expire aujourd’hui';
    if (days === 1) return 'Expire demain';
    return `Expire dans ${days} jours`;
  }

  private refresh(): void {
    this.loading.set(true);
    this.api.list(true).subscribe({
      next: files => {
        this.files.set(files);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
