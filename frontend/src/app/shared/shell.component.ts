import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { IconComponent } from './icon.component';

/** Espace connecté (maquettes « Mon espace ») : sidebar dégradée en desktop, tiroir en mobile. */
@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeDrawer()' },
  template: `
    <div class="shell">
      <aside class="sidebar gradient" [class.sidebar--open]="drawerOpen()" id="app-sidebar"
             aria-label="Navigation principale">
        <div class="sidebar-top">
          <button type="button" class="icon-btn drawer-close" (click)="closeDrawer()" aria-label="Fermer le menu">
            <app-icon name="close" [size]="18" />
          </button>
          <a class="logo logo--light" routerLink="/">DataShare</a>
        </div>

        <nav class="side-nav">
          <a routerLink="/files" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="closeDrawer()">
            Mes fichiers
          </a>
        </nav>

        <!-- Actions de la topbar desktop, accessibles depuis le tiroir en mobile -->
        <div class="side-actions">
          <button type="button" class="btn btn--dark btn--xs" (click)="openUpload()">Ajouter des fichiers</button>
          <button type="button" class="btn btn--text side-logout" (click)="logout()">
            <app-icon name="logout" [size]="12" /> Déconnexion
          </button>
        </div>

        <p class="copyright copyright--light">Copyright DataShare® 2025</p>
      </aside>

      @if (drawerOpen()) {
        <div class="drawer-overlay" (click)="closeDrawer()"></div>
      }

      <div class="main">
        <header class="topbar">
          <button type="button" class="icon-btn burger" (click)="openDrawer()" aria-label="Ouvrir le menu"
                  aria-controls="app-sidebar" [attr.aria-expanded]="drawerOpen()">
            <app-icon name="menu" [size]="20" />
          </button>
          <div class="topbar-spacer"></div>

          <div class="topbar-actions">
            <button type="button" class="btn btn--dark btn--xs" (click)="openUpload()">Ajouter des fichiers</button>
            <button type="button" class="btn btn--text" (click)="logout()">
              <app-icon name="logout" [size]="12" /> Déconnexion
            </button>
          </div>

          <div class="topbar-user">
            <span class="avatar" aria-hidden="true">{{ initial() }}</span>
            <span class="username">{{ displayName() }}</span>
          </div>
        </header>

        <main class="content" id="contenu">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .shell { display: flex; min-height: 100vh; min-height: 100dvh; }
    .sidebar {
      width: var(--sidebar-w);
      flex-shrink: 0;
      display: flex; flex-direction: column;
      padding: 18px 14px;
      position: sticky; top: 0;
      height: 100vh; height: 100dvh;
    }
    .sidebar-top { display: flex; align-items: center; gap: 8px; padding: 0 4px; }
    .sidebar .logo { font-size: 20px; }
    .side-nav { margin-top: 28px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .side-nav a {
      padding: 6px 12px;
      border-radius: var(--r-sm);
      color: #7A3B2C;
      text-decoration: none;
      font-size: 11px;
      font-weight: 500;
    }
    .side-nav a.active { background: rgba(255, 236, 226, 0.85); }
    .side-actions { display: none; }
    .sidebar .copyright { padding: 0 4px; }

    .icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      border: none; background: transparent; cursor: pointer; padding: 4px; color: inherit;
    }
    .drawer-close { display: none; color: var(--cream); }

    .main { flex: 1; min-width: 0; background: var(--bg-app); display: flex; flex-direction: column; }
    .topbar {
      height: 44px;
      padding: 0 20px;
      display: flex; align-items: center; gap: 12px;
      border-bottom: 1px solid var(--border);
      background: #FFF4EE;
      position: sticky; top: 0; z-index: 10;
    }
    .topbar-spacer { flex: 1; }
    .topbar-actions { display: flex; align-items: center; gap: 8px; }
    .topbar-user { display: none; align-items: center; gap: 8px; }
    .avatar {
      width: 26px; height: 26px; border-radius: 50%;
      background: var(--coral); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 600; font-size: 11px;
    }
    .username { font-size: 12px; font-weight: 500; }
    .burger { display: none; color: var(--text); }
    .content { padding: 20px; flex: 1; }
    .drawer-overlay { display: none; }

    @media (max-width: 760px) {
      .sidebar {
        position: fixed; left: 0; top: 0; z-index: 1001;
        width: min(78vw, 300px);
        transform: translateX(-100%);
        transition: transform .25s ease;
        visibility: hidden;
      }
      .sidebar--open { transform: translateX(0); visibility: visible; }
      .drawer-close { display: inline-flex; }
      .side-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; margin-bottom: 20px; padding: 0 4px; }
      .side-logout { color: #7A3B2C; padding: 0; }
      .burger { display: inline-flex; }
      .topbar { background: #FFFBF8; height: 48px; padding: 0 12px; }
      .topbar-actions { display: none; }
      .topbar-user { display: inline-flex; }
      .drawer-overlay { display: block; position: fixed; inset: 0; background: rgba(60, 60, 60, 0.45); z-index: 1000; }
      .content { padding: 16px 12px; }
    }
  `],
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly drawerOpen = signal(false);
  readonly displayName = computed(() => {
    const u = this.auth.user();
    if (!u) return '';
    return u.name || u.email.split('@')[0];
  });
  readonly initial = computed(() => this.displayName().charAt(0).toUpperCase() || 'U');

  openDrawer(): void { this.drawerOpen.set(true); }
  closeDrawer(): void { this.drawerOpen.set(false); }

  openUpload(): void {
    this.closeDrawer();
    window.dispatchEvent(new CustomEvent('datashare:open-upload'));
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
