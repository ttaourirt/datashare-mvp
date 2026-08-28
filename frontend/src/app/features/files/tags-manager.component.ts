import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TagApi } from '../../core/api/tag.api';
import { TagResponse } from '../../core/api/file.api';

@Component({
  selector: 'app-tags-manager',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 24px;">
      <h3>Mes tags</h3>
      <form [formGroup]="form" (ngSubmit)="add()" style="display:flex; gap:8px; margin-bottom: 12px;">
        <input formControlName="name" placeholder="Nouveau tag" maxlength="30" />
        <button type="submit" class="primary" [disabled]="form.invalid">Ajouter</button>
      </form>
      @if (tags().length === 0) {
        <p style="color: #6b7280;">Aucun tag. Créez-en pour classer vos fichiers.</p>
      } @else {
        <ul style="list-style: none; padding: 0;">
          @for (t of tags(); track t.id) {
            <li style="display:flex; justify-content:space-between; padding:4px 0;">
              <span>{{ t.name }}</span>
              <button (click)="remove(t.id)" style="color: #dc2626; border: none; background: none;">Supprimer</button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class TagsManagerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(TagApi);

  readonly tags = signal<TagResponse[]>([]);
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(30)]],
  });

  readonly tagsChanged = output<TagResponse[]>();

  constructor() {
    this.refresh();
  }

  add(): void {
    if (this.form.invalid) return;
    this.api.create(this.form.getRawValue().name).subscribe({
      next: () => { this.form.reset({ name: '' }); this.refresh(); },
    });
  }

  remove(id: number): void {
    this.api.remove(id).subscribe(() => this.refresh());
  }

  private refresh(): void {
    this.api.list().subscribe(t => {
      this.tags.set(t);
      this.tagsChanged.emit(t);
    });
  }
}
