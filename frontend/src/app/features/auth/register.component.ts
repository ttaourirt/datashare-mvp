import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page gradient-coral">
      <header class="auth-header">
        <a class="logo" routerLink="/">DataShare</a>
      </header>

      <section class="auth-body">
        <div class="card auth-card">
          <h1>Créer un compte</h1>

          @if (error()) { <div class="error-banner">{{ error() }}</div> }

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
              <input type="password" formControlName="password" autocomplete="new-password"
                     required minlength="8" />
            </label>
            <button type="submit" class="btn btn--coral" style="width:100%; margin-top:8px;"
                    [disabled]="form.invalid || loading()">
              {{ loading() ? 'Création…' : "S'inscrire" }}
            </button>
          </form>

          <p class="auth-alt">
            Déjà inscrit ? <a routerLink="/login">Se connecter</a>
          </p>
        </div>
      </section>

      <footer class="auth-footer">
        <p class="copyright">Copyright DataShare® 2025</p>
      </footer>
    </div>
  `,
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
  `],
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
