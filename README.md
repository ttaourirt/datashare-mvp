# DataShare — MVP

Prototype de plateforme de transfert sécurisé de fichiers : on envoie un fichier, on obtient un lien de téléchargement temporaire (7 jours maximum), avec ou sans compte.

## Stack

Spring Boot 3.5 (Java 21) · Angular 22 · PostgreSQL 16 · JWT · Docker

## Documentation

- [Justification du stack](docs/00-stack.md)
- [Architecture](docs/01-architecture.md)
- [Modèle de données](docs/02-data-model.md)
- [Contrat OpenAPI](docs/03-openapi.yaml) (aussi visible dans Swagger UI quand le back tourne)

## Prérequis

- Java 21 (`java -version`) — Maven n'est pas nécessaire, le wrapper `./mvnw` est fourni
- Node 22.22+ ou 24.15+ et npm (`node -v`)
- Docker avec Docker Compose (`docker compose version` ou `docker-compose version`)

## Démarrage en développement

### Installation rapide
```bash
./scripts/install.sh
```
Le script vérifie les outils, démarre PostgreSQL dans Docker et installe les dépendances du front.

### Ou étape par étape

1. Base de données
   ```bash
   docker compose up -d
   ```
   Seul PostgreSQL démarre, sur `localhost:5432` (user/pass/db : `datashare`).

2. Back-end
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```
   API sur http://localhost:8080 · Swagger UI : http://localhost:8080/swagger-ui.html.
   Au premier démarrage, Flyway crée les tables.

3. Front-end
   ```bash
   cd frontend
   npm install
   npm start
   ```
   Application sur http://localhost:4200

## Déploiement avec Docker

```bash
./scripts/deploy.sh          # construit les images et lance base + back + front
./scripts/deploy.sh stop     # arrête tout (les données restent dans les volumes)
```

- Application : http://localhost:4200 (Nginx sert le front et relaie `/api` vers le back)
- API : http://localhost:8080
- Au premier lancement, le script crée le fichier `.env` à partir de `.env.example`, avec un secret JWT aléatoire.

Arrêter le back et le front de développement avant, car ils utilisent les mêmes ports.

## Variables d'environnement

| Variable | Rôle | Valeur par défaut |
|---|---|---|
| `JWT_SECRET` | Secret qui signe les jetons JWT (32 caractères minimum) | valeur de dev ; générée par `deploy.sh` en Docker |
| `DB_URL` | Adresse JDBC de PostgreSQL | `jdbc:postgresql://localhost:5432/datashare` |
| `DB_USER` / `DB_PASSWORD` | Identifiants PostgreSQL | `datashare` / `datashare` |
| `STORAGE_ROOT` | Dossier où sont enregistrés les fichiers | `./storage/uploads` |
| `CORS_ALLOWED_ORIGINS` | Adresse(s) du front autorisée(s), séparées par des virgules | `http://localhost:4200` |

En production, changer au minimum `JWT_SECRET` et `DB_PASSWORD`, et ne jamais committer le fichier `.env`.

## Tests

```bash
cd backend && ./mvnw verify                  # tests unitaires + intégration (Docker requis)
cd frontend && npm test -- --watch=false     # tests unitaires
cd frontend && npm run e2e:run               # tests E2E (base, back et front démarrés)
```

La CI GitHub Actions (`.github/workflows/ci.yml`) lance les tests back et front à chaque push et pull request. Détails dans [TESTING.md](TESTING.md).

## Structure du repo

```
datashare-mvp/
├── backend/             # API Spring Boot (+ Dockerfile)
├── frontend/            # Application Angular (+ Dockerfile, nginx.conf)
├── docs/                # Documentation technique
├── scripts/             # install.sh (dev) et deploy.sh (Docker)
├── perf/                # Script k6 et résultats
├── .github/workflows/   # CI GitHub Actions
├── docker-compose.yml
└── .env.example
```

## Qualité

- [TESTING.md](TESTING.md) — plan de tests et résultats
- [SECURITY.md](SECURITY.md) — scans de sécurité et décisions
- [PERF.md](PERF.md) — performance back et front
- [MAINTENANCE.md](MAINTENANCE.md) — mises à jour, déploiement, incidents

## Commits

Convention : [Conventional Commits](https://www.conventionalcommits.org/).
Exemples : `feat(auth): add JWT filter`, `fix(files): handle expired token`, `docs: update MCD`.
