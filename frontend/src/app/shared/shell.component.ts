import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
    selector: 'app-shell',
    imports: [RouterLink, RouterLinkActive, RouterOutlet],
    template: `
    <div class="shell">
      <!-- Sidebar desktop / Drawer mobile -->
      <aside
        class="sidebar gradient-coral"
        [class.sidebar--open]="drawerOpen()"
      >
        <div class="sidebar-inner">
          <div class="sidebar-top">
            <a class="logo logo--light" routerLink="/">DataShare</a>
            <button
              class="drawer-close"
              (click)="closeDrawer()"
              aria-label="Fermer le menu">×</button>
          </div>

          <nav class="side-nav">
            <a
              routerLink="/files"
              routerLinkActive="active"
              (click)="closeDrawer()">
              Mes fichiers
            </a>
          </nav>

          <div class="side-footer">
            <p class="copyright copyright--light">Copyright DataShare® 2025</p>
          </div>
        </div>
      </aside>

      <!-- Overlay drawer mobile -->
      @if (drawerOpen()) {
        <div class="drawer-overlay" (click)="closeDrawer()"></div>
      }

      <!-- Main area -->
      <main class="main">
        <header class="topbar">
          <button
            class="burger"
            (click)="openDrawer()"
            aria-label="Ouvrir le menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="4" y1="7" x2="20" y2="7"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
              <line x1="4" y1="17" x2="20" y2="17"/>
            </svg>
          </button>

          <div class="topbar-spacer"></div>

          <!-- Desktop actions -->
          <div class="topbar-actions">
            <button class="btn btn--dark btn--sm" (click)="openUpload()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Ajouter des fichiers
            </button>
            <button class="btn btn--ghost btn--sm" (click)="logout()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Déconnexion
            </button>
          </div>

          <!-- Mobile user pill -->
          <div class="topbar-user">
            <span class="avatar">{{ initial() }}</span>
            <span class="username">{{ displayName() }}</span>
          </div>
        </header>

        <div class="content">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    .shell { display: flex; min-height: 100vh; }
    .sidebar {
      width: var(--sidebar-w);
      min-height: 100vh;
      color: var(--text-inv);
      flex-shrink: 0;
    }
    .sidebar-inner {
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: sticky;
      top: 0;
      padding: 24px 20px;
    }
    .sidebar-top { display: flex; align-items: center; justify-content: space-between; }
    .drawer-close {
      display: none;
      background: transparent;
      border: none;
      color: var(--text-inv);
      font-size: 26px;
      cursor: pointer;
      padding: 0 8px;
      line-height: 1;
    }
    .side-nav {
      margin-top: 32px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }
    .side-nav a {
      padding: 10px 14px;
      border-radius: var(--r-md);
      color: var(--text-inv);
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
      background: rgba(255, 247, 243, 0.15);
    }
    .side-nav a.active {
      background: rgba(255, 255, 255, 0.95);
      color: var(--text);
    }
    .side-footer { padding-top: 20px; }

    .main {
      flex: 1;
      background: var(--bg-app);
      min-width: 0;
    }
    .topbar {
      height: 68px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-app);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .topbar-spacer { flex: 1; }
    .topbar-actions { display: flex; gap: 10px; }
    .topbar-user { display: none; align-items: center; gap: 8px; }
    .avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: var(--coral-500);
      color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 600;
      font-size: 13px;
    }
    .username { font-size: 14px; font-weight: 500; }

    .burger {
      display: none;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 8px;
      color: var(--text);
    }
    .content { padding: 24px; }
    .drawer-overlay { display: none; }

    @media (max-width: 900px) {
      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        transform: translateX(-100%);
        transition: transform .25s ease;
        z-index: 1001;
      }
      .sidebar--open { transform: translateX(0); }
      .drawer-close { display: inline-flex; align-items: center; }
      .burger { display: inline-flex; }
      .topbar-actions { display: none; }
      .topbar-user { display: inline-flex; }
      .drawer-overlay {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(20, 5, 0, 0.5);
        z-index: 1000;
      }
      .content { padding: 16px; }
    }
  `]
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly drawerOpen = signal(false);
  readonly displayName = computed(() => {
    const u = this.auth.user();
    if (!u) return '';
    if (u.name) return u.name;
    return u.email ? u.email.split('@')[0] : '';
  });
  readonly initial = computed(() => {
    const name = this.displayName();
    return name.length > 0 ? name[0].toUpperCase() : 'U';
  });

  openDrawer(): void { this.drawerOpen.set(true); }
  closeDrawer(): void { this.drawerOpen.set(false); }

  openUpload(): void {
    window.dispatchEvent(new CustomEvent('datashare:open-upload'));
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
