import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="card">
      <h1>Connexion</h1>
      @if (justRegistered()) {
        <div style="background:#ecfdf5; padding:8px; border-radius:6px; margin-bottom:12px;">
          Compte créé. Connectez-vous.
        </div>
      }
      @if (error()) { <div class="error">{{ error() }}</div> }
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label class="field">
          <span>Email</span>
          <input type="email" formControlName="email" autocomplete="email" required />
        </label>
        <label class="field">
          <span>Mot de passe</span>
          <input type="password" formControlName="password" autocomplete="current-password" required />
        </label>
        <button type="submit" class="primary" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>
      <p style="margin-top: 16px;">
        Pas de compte ? <a routerLink="/register">Créer un compte</a>
      </p>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly justRegistered = signal(this.route.snapshot.queryParamMap.get('registered') === '1');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl('/files'),
      error: err => {
        this.error.set(err?.error?.message ?? 'Identifiants invalides');
        this.loading.set(false);
      },
    });
  }
}
