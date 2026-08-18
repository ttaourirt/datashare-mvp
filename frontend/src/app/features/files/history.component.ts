import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-history',
  standalone: true,
  template: `
    <div style="max-width: 800px; margin: 40px auto; padding: 24px;">
      <h1>Mes fichiers</h1>
      <p>Bienvenue {{ auth.user()?.email }}.</p>
      <p style="color: #6b7280;">L'upload et l'historique (US01 et US05) seront implémentés dans les étapes suivantes.</p>
    </div>
  `,
})
export class HistoryComponent {
  protected readonly auth = inject(AuthService);
}
