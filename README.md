# DataShare — MVP

Prototype de plateforme de transfert sécurisé de fichiers.

## Stack

Spring Boot 3.5 (Java 21) · Angular 22 · PostgreSQL 16 · JWT

## Documentation

- [Justification du stack](docs/00-stack.md)
- [Architecture](docs/01-architecture.md)
- [Modèle de données](docs/02-data-model.md)
- [Contrat OpenAPI](docs/03-openapi.yaml)

## Prérequis

- Java 21 (`java -version`)
- Maven 3.9+ (`mvn -v`)
- Node 22.22+ ou 24.15+ et npm (`node -v`)
- Docker Desktop (pour Postgres local)
- Angular CLI (optionnel, `npx ng` suffit) : `npm i -g @angular/cli@22`

## Démarrage local

### 1. Base de données
```bash
docker compose up -d
```
Postgres écoute sur `localhost:5432` (user/pass/db : `datashare`).

### 2. Back-end
```bash
cd backend
./mvnw spring-boot:run
```
API sur http://localhost:8080  ·  Swagger UI : http://localhost:8080/swagger-ui.html

### 3. Front-end
```bash
cd frontend
npm install
npm start
```
App sur http://localhost:4200

## Structure du repo

```
datashare-mvp/
├── backend/            # Spring Boot
├── frontend/           # Angular
├── docs/               # Documentation technique
├── docker-compose.yml
└── README.md
```

## Qualité

- [TESTING.md](TESTING.md)
- [SECURITY.md](SECURITY.md)
- [PERF.md](PERF.md)
- [MAINTENANCE.md](MAINTENANCE.md)

## Commits

Convention : [Conventional Commits](https://www.conventionalcommits.org/).
Exemples : `feat(auth): add JWT filter`, `fix(files): handle expired token`, `docs: update MCD`.
