import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FileApi, FileResponse, TagResponse } from '../../core/api/file.api';
import { UploadComponent } from './upload.component';
import { TagsManagerComponent } from './tags-manager.component';
import { formatBytes } from '../../shared/format';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, DatePipe, UploadComponent, TagsManagerComponent],
  template: `
    <div style="max-width: 900px; margin: 24px auto; padding: 0 16px;">
      <h1>Mon espace</h1>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <app-upload #uploader (uploaded)="onUploaded($event)" />
        <app-tags-manager (tagsChanged)="onTags($event, uploader)" #tags />
      </div>

      <h3>Mes fichiers</h3>
      <label style="font-size: 14px;">
        <input type="checkbox" [checked]="includeExpired()" (change)="toggleExpired($event)" />
        Inclure les fichiers expirés
      </label>

      @if (files().length === 0) {
        <p style="color:#6b7280;">Aucun fichier.</p>
      } @else {
        <table style="width: 100%; margin-top: 12px; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 1px solid #e5e7eb;">
              <th style="padding: 8px 4px;">Nom</th>
              <th style="padding: 8px 4px;">Taille</th>
              <th style="padding: 8px 4px;">Expire</th>
              <th style="padding: 8px 4px;">Statut</th>
              <th style="padding: 8px 4px;">Lien</th>
              <th style="padding: 8px 4px;"></th>
            </tr>
          </thead>
          <tbody>
            @for (f of files(); track f.id) {
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px 4px;">
                  {{ f.originalName }}
                  @if (f.passwordProtected) { <span title="Protégé par mot de passe">🔒</span> }
                  @if (f.tags.length) {
                    <br /><small style="color:#6b7280;">{{ tagsLabel(f.tags) }}</small>
                  }
                </td>
                <td style="padding: 8px 4px;">{{ humanSize(f.sizeBytes) }}</td>
                <td style="padding: 8px 4px;">{{ f.expiresAt | date:'short' }}</td>
                <td style="padding: 8px 4px;">
                  @if (f.expired) { <span style="color:#dc2626;">expiré</span> }
                  @else { <span style="color:#059669;">valide</span> }
                </td>
                <td style="padding: 8px 4px;">
                  @if (!f.expired) {
                    <button (click)="copyLink(f.publicToken)" style="font-size:12px;">Copier lien</button>
                  }
                </td>
                <td style="padding: 8px 4px;">
                  <button (click)="remove(f)" style="color:#dc2626; border:none; background:none;">Supprimer</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class HistoryComponent {
  private readonly api = inject(FileApi);

  protected readonly files = signal<FileResponse[]>([]);
  protected readonly includeExpired = signal(false);

  constructor() {
    this.refresh();
  }

  onUploaded(_: FileResponse): void { this.refresh(); }

  onTags(tags: TagResponse[], uploader: UploadComponent): void {
    uploader.setTags(tags);
  }

  toggleExpired(ev: Event): void {
    this.includeExpired.set((ev.target as HTMLInputElement).checked);
    this.refresh();
  }

  remove(f: FileResponse): void {
    if (!confirm(`Supprimer "${f.originalName}" ? Action irréversible.`)) return;
    this.api.remove(f.id).subscribe(() => this.refresh());
  }

  copyLink(token: string): void {
    const url = `${window.location.origin}/d/${token}`;
    navigator.clipboard.writeText(url);
  }

  humanSize = formatBytes;
  tagsLabel = (tags: TagResponse[]) => tags.map(t => `#${t.name}`).join(' ');

  private refresh(): void {
    this.api.list(this.includeExpired()).subscribe(f => this.files.set(f));
  }
}
