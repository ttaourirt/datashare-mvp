import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
    selector: 'app-login',
    imports: [ReactiveFormsModule, RouterLink],
    template: `
    <div class="auth-page gradient-coral">
      <header class="auth-header">
        <a class="logo" routerLink="/">DataShare</a>
      </header>

      <section class="auth-body">
        <div class="card auth-card">
          <h1>Connexion</h1>

          @if (justRegistered()) {
            <div class="success-banner">
              Compte créé avec succès. Connecte-toi maintenant.
            </div>
          }
          @if (error()) { <div class="error-banner">{{ error() }}</div> }

          <form [formGroup]="form" (ngSubmit)="submit()">
            <label class="field">
              <span>Email</span>
              <input type="email" formControlName="email" autocomplete="email" required />
            </label>
            <label class="field">
              <span>Mot de passe</span>
              <input type="password" formControlName="password" autocomplete="current-password" required />
            </label>
            <button type="submit" class="btn btn--coral" style="width:100%; margin-top:8px;"
                    [disabled]="form.invalid || loading()">
              {{ loading() ? 'Connexion…' : 'Se connecter' }}
            </button>
          </form>

          <p class="auth-alt">
            Pas de compte ? <a routerLink="/register">Créer un compte</a>
          </p>
        </div>
      </section>

      <footer class="auth-footer">
        <p class="copyright">Copyright DataShare® 2025</p>
      </footer>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    .auth-page { min-height: 100vh; display: flex; flex-direction: column; }
    .auth-header { padding: 24px 32px; }
    .auth-body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .auth-card { width: 100%; max-width: 400px; }
    .auth-card h1 {
      font-family: 'Instrument Serif', Georgia, serif;
      font-weight: 400;
      font-size: 28px;
      margin: 0 0 16px;
    }
    .auth-alt { margin-top: 20px; font-size: 14px; text-align: center; }
    .auth-alt a { font-weight: 500; }
    .auth-footer { padding: 8px 32px 24px; }
  `]
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
