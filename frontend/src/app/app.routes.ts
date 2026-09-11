import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'd/:token',
    loadComponent: () => import('./features/public/download.component').then(m => m.DownloadComponent),
  },
  {
    path: 'files',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/files/history.component').then(m => m.HistoryComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
