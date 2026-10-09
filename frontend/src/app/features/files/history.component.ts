import { Component, ChangeDetectionStrategy, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { FileApi, FileResponse } from '../../core/api/file.api';
import { UploadModalComponent } from './upload-modal.component';
import { daysUntil, formatBytes } from '../../shared/format';
import { TagInputComponent } from '../../shared/tag-input.component';
import { IconComponent } from '../../shared/icon.component';

type Filter = 'all' | 'active' | 'expired';

/** US05 / US06 / US08 — « Mes fichiers ». */
@Component({
  selector: 'app-history',
  imports: [DatePipe, UploadModalComponent, TagInputComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'menuFor.set(null)' },
  template: `
    <h1 class="title">Mes fichiers</h1>

    <div class="toolbar">
      <div class="switch" role="tablist" aria-label="Filtrer les fichiers">
        @for (t of tabs; track t.value) {
          <button type="button" role="tab" [attr.aria-selected]="filter() === t.value"
                  (click)="filter.set(t.value)">{{ t.label }}</button>
        }
      </div>

      @if (allTags().length > 0) {
        <label class="tag-filter">
          <span class="sr-only">Filtrer par tag</span>
          <select class="input" [value]="tagFilter() ?? ''" (change)="setTagFilter($any($event.target).value)">
            <option value="">Tous les tags</option>
            @for (t of allTags(); track t) { <option [value]="t">{{ t }}</option> }
          </select>
        </label>
      }
    </div>

    @if (loading()) {
      <p class="text-mut">Chargement…</p>
    } @else if (filtered().length === 0) {
      <p class="empty text-mut">Aucun fichier {{ filter() === 'expired' ? 'expiré' : filter() === 'active' ? 'actif' : '' }} pour le moment.</p>
    } @else {
      <ul class="files" role="list">
        @for (f of filtered(); track f.id) {
          <li class="file-row">
            <app-icon class="file-row__icon" name="file" [size]="18" />

            <div class="file-row__meta">
              <div class="file-row__name" [title]="f.originalName">{{ f.originalName }}</div>
              <div class="file-row__sub">
                <span [class.expired]="f.expired">{{ statusLabel(f) }}</span>
                <span class="file-row__details">
                  · {{ humanSize(f.sizeBytes) }}
                  · Envoyé le {{ f.uploadedAt | date:'dd/MM/yyyy HH:mm' }}
                  · Expire le {{ f.expiresAt | date:'dd/MM/yyyy HH:mm' }}
                </span>
              </div>
              @if (f.tags.length > 0) {
                <div class="file-row__tags">
                  @for (t of f.tags; track t.id) { <span class="tag-chip">{{ t.name }}</span> }
                </div>
              }
            </div>

            @if (f.passwordProtected) {
              <span class="lock" title="Protégé par mot de passe">
                <app-icon name="lock" [size]="12" />
                <span class="sr-only">Protégé par mot de passe</span>
              </span>
            }

            @if (f.expired) {
              <span class="expired-msg">Ce fichier a expiré, il n'est plus stocké chez nous</span>
            } @else {
              <div class="actions">
                <button type="button" class="btn btn--outline btn--xs" (click)="startEditTags(f)"
                        [attr.aria-expanded]="editingId() === f.id">
                  <app-icon name="tag" [size]="11" /> Tags
                </button>
                <button type="button" class="btn btn--outline btn--xs" (click)="remove(f)">
                  <app-icon name="trash" [size]="11" /> Supprimer
                </button>
                <a class="btn btn--outline btn--xs" [href]="publicPath(f)" target="_blank" rel="noopener">
                  Accéder <app-icon name="arrowRight" [size]="11" />
                </a>
              </div>

              <div class="kebab">
                <button type="button" class="btn btn--outline btn--xs btn--icon"
                        [attr.aria-label]="'Actions pour ' + f.originalName"
                        aria-haspopup="menu" [attr.aria-expanded]="menuFor() === f.id"
                        (click)="toggleMenu(f.id, $event)">
                  <app-icon name="more" [size]="12" />
                </button>
                @if (menuFor() === f.id) {
                  <div class="menu" role="menu" (click)="$event.stopPropagation()">
                    <a role="menuitem" [href]="publicPath(f)" target="_blank" rel="noopener">
                      <app-icon name="arrowRight" [size]="12" /> Accéder
                    </a>
                    <button type="button" role="menuitem" (click)="startEditTags(f)">
                      <app-icon name="tag" [size]="12" /> Tags
                    </button>
                    <button type="button" role="menuitem" class="danger" (click)="remove(f)">
                      <app-icon name="trash" [size]="12" /> Supprimer
                    </button>
                  </div>
                }
              </div>
            }

            @if (editingId() === f.id) {
              <div class="tags-editor">
                <app-tag-input [inputId]="'tags-' + f.id" label="Tags du fichier" [(tags)]="editTags" />
                <div class="tags-editor__actions">
                  <button type="button" class="btn btn--text" (click)="editingId.set(null)">Annuler</button>
                  <button type="button" class="btn btn--primary btn--xs" (click)="saveTags(f)">Enregistrer</button>
                </div>
              </div>
            }
          </li>
        }
      </ul>
    }

    @if (uploadOpen()) {
      <app-upload-modal (close)="uploadOpen.set(false)" (uploaded)="refresh()" />
    }
  `,
  styles: [`
    .title { font-size: 20px; font-weight: 700; margin: 4px 0 14px; }
    .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 14px; }
    .tag-filter select { height: 26px; width: auto; min-width: 140px; font-size: 11px; padding: 0 8px; }
    .empty { font-size: 12px; }
    .files { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .file-row {
      display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
      padding: 9px 12px;
      background: var(--bg-row);
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
    }
    .file-row__icon { flex-shrink: 0; }
    .file-row__meta { flex: 1 1 0; min-width: 0; }
    .file-row__name {
      font-size: 12px; font-weight: 500;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .file-row__sub { font-size: 10px; color: var(--text); }
    .file-row__details { color: var(--text-mut); }
    .expired { color: var(--danger-text); }
    .file-row__tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .lock { display: inline-flex; color: var(--text); }
    .actions { display: flex; gap: 6px; }
    .expired-msg { font-size: 10px; color: var(--text-mut); text-align: right; }
    .kebab { display: none; position: relative; }
    .menu {
      position: absolute; right: 0; top: calc(100% + 4px); z-index: 20;
      min-width: 140px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      box-shadow: var(--sh-card);
      padding: 4px;
      display: flex; flex-direction: column;
    }
    .menu a, .menu button {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px;
      border: none; background: transparent; border-radius: var(--r-xs);
      font: inherit; font-size: 12px; text-align: left; text-decoration: none; color: var(--text);
      cursor: pointer;
    }
    .menu a:hover, .menu button:hover { background: var(--bg-muted); }
    .menu .danger { color: var(--danger-text); }
    .tags-editor { flex-basis: 100%; padding: 4px 0 0 28px; }
    .tags-editor__actions { display: flex; justify-content: flex-end; gap: 8px; }

    @media (max-width: 760px) {
      .file-row__details { display: none; }
      .actions, .expired-msg { display: none; }
      .kebab { display: block; }
      .tags-editor { padding-left: 0; }
    }
  `],
})
export class HistoryComponent {
  private readonly api = inject(FileApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tabs: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Tous' },
    { value: 'active', label: 'Actifs' },
    { value: 'expired', label: 'Expiré' },
  ];

  protected readonly files = signal<FileResponse[]>([]);
  protected readonly loading = signal(true);
  // US06 — seuls les fichiers non expirés sont affichés par défaut
  protected readonly filter = signal<Filter>('active');
  protected readonly tagFilter = signal<string | null>(null);
  protected readonly uploadOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly editTags = signal<string[]>([]);
  protected readonly menuFor = signal<number | null>(null);

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
    // Ouvrir la modale quand la topbar clique « Ajouter des fichiers »
    fromEvent(window, 'datashare:open-upload')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.uploadOpen.set(true));
    this.refresh();
  }

  toggleMenu(id: number, ev: Event): void {
    ev.stopPropagation();
    this.menuFor.update(cur => (cur === id ? null : id));
  }

  remove(f: FileResponse): void {
    this.menuFor.set(null);
    if (!confirm(`Supprimer « ${f.originalName} » ? Cette action est irréversible.`)) return;
    this.api.remove(f.id).subscribe(() => this.refresh());
  }

  setTagFilter(value: string): void {
    this.tagFilter.set(value || null);
  }

  startEditTags(f: FileResponse): void {
    this.menuFor.set(null);
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
    const days = daysUntil(f.expiresAt);
    if (days <= 0) return 'Expire aujourd’hui';
    if (days === 1) return 'Expire demain';
    return `Expire dans ${days} jours`;
  }

  refresh(): void {
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
