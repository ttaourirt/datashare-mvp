import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PublicLayoutComponent } from '../../shared/public-layout.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, PublicLayoutComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-public-layout>
      <section class="card auth-card" aria-labelledby="login-title">
        <h1 class="card-title" id="login-title">Connexion</h1>

        @if (justRegistered()) {
          <div class="callout callout--success" role="status">Compte créé. Tu peux te connecter.</div>
        }
        @if (error()) {
          <div class="callout callout--error" role="alert"><app-icon name="error" [size]="12" /> {{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label class="field-label" for="login-email">Email</label>
            <input id="login-email" type="email" formControlName="email" autocomplete="email"
                   placeholder="Saisissez votre email..." required
                   [attr.aria-invalid]="invalid('email') ? true : null" />
            @if (invalid('email')) { <p class="field-error">Saisis une adresse email valide.</p> }
          </div>
          <div class="field">
            <label class="field-label" for="login-password">Mot de passe</label>
            <input id="login-password" type="password" formControlName="password" autocomplete="current-password"
                   placeholder="Saisissez votre mot de passe..." required />
          </div>

          <p class="auth-alt"><a class="link" routerLink="/register">Créer un compte</a></p>

          <button type="submit" class="btn btn--primary btn--block" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Connexion…' : 'Connexion' }}
          </button>
        </form>
      </section>
    </app-public-layout>
  `,
  styles: [`
    .auth-card { max-width: 640px; }
    .auth-alt { text-align: center; margin: 4px 0 10px; }
  `],
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

  invalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.touched && c.invalid;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl('/files'),
      error: () => {
        this.error.set('Email ou mot de passe incorrect.');
        this.loading.set(false);
      },
    });
  }
}
