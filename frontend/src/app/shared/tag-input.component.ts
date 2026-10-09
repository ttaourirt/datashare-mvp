import { Component, input, model, signal, ChangeDetectionStrategy } from '@angular/core';

export const MAX_TAG_LENGTH = 30;

/** US08 — saisie libre de tags : Entrée ou virgule pour valider, pas de doublon, 30 caractères max. */
@Component({
  selector: 'app-tag-input',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="field">
      <label class="field-label" [for]="inputId()">{{ label() }}</label>
      <div class="tag-input">
        @for (t of tags(); track t) {
          <span class="tag-chip">
            {{ t }}
            <button type="button" class="tag-chip__remove" [attr.aria-label]="'Retirer le tag ' + t"
                    (click)="remove(t)">×</button>
          </span>
        }
        <input
          [id]="inputId()"
          type="text"
          [maxLength]="maxLength"
          placeholder="Entrée pour ajouter"
          [attr.aria-describedby]="error() ? inputId() + '-error' : null"
          [attr.aria-invalid]="error() ? true : null"
          (keydown)="onKeydown($event)"
          (blur)="add($any($event.target))" />
      </div>
      @if (error()) {
        <p class="field-error" role="alert" [id]="inputId() + '-error'">{{ error() }}</p>
      }
    </div>
  `,
})
export class TagInputComponent {
  readonly tags = model<string[]>([]);
  readonly label = input('Tags (facultatif)');
  readonly inputId = input('tags');

  readonly maxLength = MAX_TAG_LENGTH;
  readonly error = signal<string | null>(null);

  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' || ev.key === ',') {
      ev.preventDefault();
      this.add(ev.target as HTMLInputElement);
    }
  }

  add(field: HTMLInputElement): void {
    const value = field.value.trim();
    if (!value) return;
    if (value.length > MAX_TAG_LENGTH) {
      this.error.set(`Un tag fait au maximum ${MAX_TAG_LENGTH} caractères.`);
      return;
    }
    if (this.tags().some(t => t.toLowerCase() === value.toLowerCase())) {
      this.error.set(`Le tag « ${value} » est déjà ajouté.`);
      return;
    }
    this.tags.update(list => [...list, value]);
    this.error.set(null);
    field.value = '';
  }

  remove(tag: string): void {
    this.tags.update(list => list.filter(t => t !== tag));
  }
}
