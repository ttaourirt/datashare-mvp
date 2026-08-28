import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header style="padding: 12px 24px; border-bottom: 1px solid #e5e7eb; display:flex; gap:16px; align-items:center;">
      <a routerLink="/" style="font-weight: bold;">DataShare</a>
      <span style="flex: 1;"></span>
      @if (auth.user()) {
        <span>{{ auth.user()!.email }}</span>
        <button (click)="logout()">Déconnexion</button>
      } @else {
        <a routerLink="/send">Envoi anonyme</a>
        <a routerLink="/login">Connexion</a>
        <a routerLink="/register">Créer un compte</a>
      }
    </header>
    <main>
      <router-outlet />
    </main>
  `,
})
export class AppComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
