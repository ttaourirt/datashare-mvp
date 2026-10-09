import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PublicLayoutComponent } from '../../shared/public-layout.component';
import { IconComponent } from '../../shared/icon.component';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { password, confirm } = group.value as { password: string; confirm: string };
  return confirm && password !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, PublicLayoutComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-public-layout>
      <section class="card auth-card" aria-labelledby="register-title">
        <h1 class="card-title" id="register-title">Créer un compte</h1>

        @if (error()) {
          <div class="callout callout--error" role="alert"><app-icon name="error" [size]="12" /> {{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label class="field-label" for="register-email">Email</label>
            <input id="register-email" type="email" formControlName="email" autocomplete="email"
                   placeholder="Saisissez votre email..." required
                   [attr.aria-invalid]="touchedInvalid('email') ? true : null"
                   [attr.aria-describedby]="touchedInvalid('email') ? 'register-email-error' : null" />
            @if (touchedInvalid('email')) {
              <p class="field-error" id="register-email-error">Saisis une adresse email valide.</p>
            }
          </div>
          <div class="field">
            <label class="field-label" for="register-password">Mot de passe</label>
            <input id="register-password" type="password" formControlName="password" autocomplete="new-password"
                   placeholder="Saisissez votre mot de passe..." required
                   [attr.aria-invalid]="touchedInvalid('password') ? true : null"
                   [attr.aria-describedby]="'register-password-hint'" />
            <p class="field-hint" id="register-password-hint"
               [class.field-error]="touchedInvalid('password')">8 caractères minimum.</p>
          </div>
          <div class="field">
            <label class="field-label" for="register-confirm">Vérification du mot de passe</label>
            <input id="register-confirm" type="password" formControlName="confirm" autocomplete="new-password"
                   placeholder="Saisissez le à nouveau" required
                   [attr.aria-invalid]="mismatch() ? true : null"
                   [attr.aria-describedby]="mismatch() ? 'register-confirm-error' : null" />
            @if (mismatch()) {
              <p class="field-error" id="register-confirm-error">Les mots de passe ne correspondent pas.</p>
            }
          </div>

          <p class="auth-alt"><a class="link" routerLink="/login">J'ai déjà un compte</a></p>

          <button type="submit" class="btn btn--primary btn--block" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Création…' : 'Créer mon compte' }}
          </button>
        </form>
      </section>
    </app-public-layout>
  `,
  styles: [`
    .auth-card { max-width: 640px; }
    .auth-alt { text-align: center; margin: 4px 0 10px; }
    .field-hint { margin: 6px 0 0; font-size: 11px; color: var(--text-mut); }
  `],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // US03 — email valide, mot de passe ≥ 8 caractères (contrôlés aussi côté serveur)
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', [Validators.required]],
  }, { validators: passwordsMatch });

  touchedInvalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.touched && c.invalid;
  }

  mismatch(): boolean {
    return this.form.controls.confirm.touched && this.form.hasError('mismatch');
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.register(email, password).subscribe({
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
