import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="shell">
      <!-- Sidebar desktop / Drawer mobile -->
      <aside
        class="sidebar gradient-coral"
        [class.sidebar--open]="drawerOpen()"
      >
        <div class="sidebar-inner">
          <a class="logo logo--light" routerLink="/">DataShare</a>

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

          <div style="flex:1"></div>

          <div class="topbar-actions">
            <button class="btn btn--dark btn--sm" (click)="openUpload()">
              Ajouter des fichiers
            </button>
            <button class="btn btn--outline-dark btn--sm" (click)="logout()">
              → Déconnexion
            </button>
          </div>
        </header>

        <div class="content">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
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
      background: rgba(255, 255, 255, 0.9);
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
    .topbar-actions { display: flex; gap: 10px; }
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
      .burger { display: inline-flex; }
      .drawer-overlay {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(20, 5, 0, 0.5);
        z-index: 1000;
      }
      .content { padding: 16px; }
    }
  `],
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly drawerOpen = signal(false);

  openDrawer(): void { this.drawerOpen.set(true); }
  closeDrawer(): void { this.drawerOpen.set(false); }

  openUpload(): void {
    // On dispatche un event global — récupéré par HistoryComponent
    window.dispatchEvent(new CustomEvent('datashare:open-upload'));
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
