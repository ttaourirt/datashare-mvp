import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="card">
      <h1>Créer un compte</h1>
      @if (error()) { <div class="error">{{ error() }}</div> }
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label class="field">
          <span>Email</span>
          <input type="email" formControlName="email" autocomplete="email" required />
        </label>
        <label class="field">
          <span>Nom (facultatif)</span>
          <input type="text" formControlName="name" autocomplete="name" />
        </label>
        <label class="field">
          <span>Mot de passe (min. 8 caractères)</span>
          <input type="password" formControlName="password" autocomplete="new-password" required minlength="8" />
        </label>
        <button type="submit" class="primary" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Création...' : "S'inscrire" }}
        </button>
      </form>
      <p style="margin-top: 16px;">
        Déjà inscrit ? <a routerLink="/login">Se connecter</a>
      </p>
    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    name: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password, name } = this.form.getRawValue();
    this.auth.register(email, password, name || undefined).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { registered: '1' } }),
      error: err => {
        this.error.set(this.pickError(err));
        this.loading.set(false);
      },
    });
  }

  private pickError(err: unknown): string {
    const e = err as { status?: number; error?: { message?: string; fieldErrors?: Array<{ message: string }> } };
    if (e.status === 409) return 'Cet email est déjà utilisé.';
    return e.error?.fieldErrors?.[0]?.message ?? e.error?.message ?? "Erreur lors de l'inscription.";
  }
}
