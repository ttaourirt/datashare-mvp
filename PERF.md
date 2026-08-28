# PERF.md — Suivi de performance

## Endpoints critiques

| Endpoint | Charge attendue | SLO cible |
|---|---|---|
| `POST /api/v1/auth/login` | Faible mais spike au démarrage de la matinée | p95 < 200 ms |
| `POST /api/v1/files` (upload) | Moyenne (dépend de la taille fichier) | Débit ≥ 50 Mbit/s, pas d'OOM |
| `GET /api/v1/files` (historique) | Élevée (page consultée souvent) | p95 < 150 ms |
| `POST /api/v1/public/files/{token}/download` | Élevée (tout le trafic download) | Débit ≥ 50 Mbit/s |

## Test de charge (k6)

Fichier `perf/k6-download.js` (à créer) :

```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // ramp-up
    { duration: '1m',  target: 20 },  // plateau
    { duration: '20s', target: 0 },   // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const token = __ENV.TOKEN;
  const res = http.get('http://localhost:8080/api/v1/files', {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(res, { 'status 200': r => r.status === 200 });
  sleep(1);
}
```

Exécution :
```bash
docker run --rm -i --network=host \
    -e TOKEN=<jwt> \
    grafana/k6 run - < perf/k6-download.js
```

## Métriques suivies (à annexer avec captures)

- **Temps de réponse** p50/p95/p99 par endpoint (via Spring Boot Actuator + Micrometer)
- **Débit** upload / download (MB/s)
- **Erreurs 5xx** — doit rester 0 sous charge nominale
- **Mémoire heap JVM** — doit rester < 512 Mo sous charge nominale
- **Taille du bundle Angular** (`ng build` affiche le rapport)

## Budget de performance front (Angular)

Défini dans `angular.json → build.configurations.production.budgets` :

- Bundle initial : warning à **500 kB**, error à **1 MB**
- Styles par composant : warning à **4 kB**

Vérification :
```bash
cd frontend
npm run build
# affiche taille initial + lazy chunks
```

## Optimisations déjà appliquées

- **Lazy loading** des routes Angular (chaque feature = chunk séparé).
- **OnPush change detection** (via signals) — moins de re-renders.
- **Index BDD** sur `owner_id`, `expires_at`, `public_token`.
- **Streaming download** — `InputStreamResource` — ne charge pas le fichier entier en mémoire.
- **JPA `open-in-view: false`** — évite les requêtes N+1 tardives.

## À suivre (roadmap)

- Ajout de Micrometer + endpoint `/actuator/prometheus`.
- Grafana dashboard : latence, débit, taille disque `storage/`.
- Compression réponses (`server.compression.enabled=true`).
- Cache HTTP sur les métadonnées publiques (`Cache-Control: public, max-age=60`).
