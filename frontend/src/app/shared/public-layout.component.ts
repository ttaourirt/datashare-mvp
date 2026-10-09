import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

/** Gabarit des pages publiques (Figma « Header Component ») : dégradé, logo, accès compte, copyright. */
@Component({
  selector: 'app-public-layout',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page gradient">
      <header class="page-header">
        <a class="logo" routerLink="/">DataShare</a>
        @if (auth.user()) {
          <a class="btn btn--dark btn--xs" routerLink="/files">Mon espace</a>
        } @else {
          <a class="btn btn--dark btn--xs" routerLink="/login">Se connecter</a>
        }
      </header>

      <main class="page-main" id="contenu">
        <ng-content />
      </main>

      <footer class="page-footer">
        <p class="copyright">Copyright DataShare® 2025</p>
      </footer>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; }
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px var(--gutter);
    }
    .page-main {
      flex: 1;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 24px 16px;
    }
    .page-footer { padding: 16px var(--gutter) 20px; }
    @media (max-width: 600px) {
      .page-header { padding: 12px 16px; }
      .logo { font-size: 18px; }
    }
  `],
})
export class PublicLayoutComponent {
  protected readonly auth = inject(AuthService);
}
