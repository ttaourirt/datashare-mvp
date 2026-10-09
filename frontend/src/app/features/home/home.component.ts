import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { FileResponse } from '../../core/api/file.api';
import { UploadModalComponent } from '../files/upload-modal.component';
import { PublicLayoutComponent } from '../../shared/public-layout.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-home',
  imports: [UploadModalComponent, PublicLayoutComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-public-layout>
      <h1 class="hero-title">Tu veux partager un fichier ?</h1>

      <!-- Le bouton ouvre directement le sélecteur de fichier (maquette « Téléversement ») -->
      <label class="hero-upload">
        <input class="sr-only" type="file" (change)="onPick($event)" />
        <span class="hero-upload__btn">
          <app-icon name="upload" [size]="34" [stroke]="1.8" />
        </span>
        <span class="sr-only">Choisir un fichier à envoyer</span>
      </label>
    </app-public-layout>

    @if (file(); as f) {
      <app-upload-modal
        [initialFile]="f"
        [anonymous]="!auth.user()"
        (close)="file.set(null)"
        (uploaded)="onUploaded($event)" />
    }
  `,
  styles: [`
    .hero-title {
      font-size: 20px;
      font-weight: 400;
      text-align: center;
      max-width: 240px;
      margin: 0 0 28px;
    }
    .hero-upload { cursor: pointer; border-radius: 50%; }
    .hero-upload__btn {
      display: flex; align-items: center; justify-content: center;
      width: 84px; height: 84px;
      border-radius: 50%;
      background: #160A06;
      color: var(--cream);
      box-shadow: 0 0 0 26px rgba(110, 50, 30, 0.22);
      transition: transform .12s ease;
    }
    .hero-upload:hover .hero-upload__btn { transform: scale(1.04); }
    .hero-upload:focus-within .hero-upload__btn { outline: 2px solid var(--dark); outline-offset: 30px; }
    @media (min-width: 720px) {
      .hero-title { font-size: 22px; max-width: none; }
    }
  `],
})
export class HomeComponent {
  protected readonly auth = inject(AuthService);
  readonly file = signal<File | null>(null);

  onPick(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const picked = input.files?.[0] ?? null;
    input.value = '';
    if (picked) this.file.set(picked);
  }

  onUploaded(_: FileResponse): void {
    // La modale affiche elle-même le lien de partage (état « Félicitations »).
  }
}
