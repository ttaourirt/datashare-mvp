import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { FileApi, FileResponse } from '../../core/api/file.api';
import { UploadModalComponent } from './upload-modal.component';
import { formatBytes } from '../../shared/format';

type Filter = 'all' | 'active' | 'expired';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, DatePipe, UploadModalComponent],
  template: `
    <div class="history">
      <h1>Mes fichiers</h1>

      <div class="tabs" role="tablist">
        <button
          role="tab"
          [class.active]="filter() === 'all'"
          (click)="filter.set('all')">Tout</button>
        <button
          role="tab"
          [class.active]="filter() === 'active'"
          (click)="filter.set('active')">Actifs</button>
        <button
          role="tab"
          [class.active]="filter() === 'expired'"
          (click)="filter.set('expired')">Expiré</button>
      </div>

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
                  <div class="file-sub text-mut">{{ statusLabel(f) }} · {{ humanSize(f.sizeBytes) }}</div>
                </div>

                <div class="file-actions">
                  @if (!f.expired) {
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
    .file-meta { flex: 1; min-width: 0; }
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
    @media (max-width: 700px) {
      .file-row { flex-wrap: wrap; }
      .file-actions { width: 100%; justify-content: flex-end; }
    }
  `],
})
export class HistoryComponent {
  private readonly api = inject(FileApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly files = signal<FileResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly filter = signal<Filter>('all');
  protected readonly uploadOpen = signal(false);

  protected readonly filtered = computed(() => {
    const all = this.files();
    const f = this.filter();
    if (f === 'active') return all.filter(x => !x.expired);
    if (f === 'expired') return all.filter(x => x.expired);
    return all;
  });

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
