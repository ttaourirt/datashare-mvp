# Choix du stack technique

## Résumé

| Couche | Technologie | Version |
|---|---|---|
| Back-end | Spring Boot | 3.5.x (Java 21 LTS) |
| Build back | Maven | 3.9.x |
| Front-end | Angular | 22 (standalone components, signals) |
| Base de données | PostgreSQL | 16 |
| Migrations SQL | Flyway | 10.x |
| Auth | JWT (jjwt) | 0.12.x |
| Stockage fichiers | Système de fichiers local (`./storage/uploads`) | — |
| API doc | SpringDoc OpenAPI | 2.5.x → Swagger UI auto |
| Tests back | JUnit 5 + Mockito + Testcontainers | — |
| Tests front | Vitest (unit) + Cypress 16 (E2E) | — |
| Infra dev | Docker Compose (Postgres) | — |

## Justifications

### Spring Boot + Java 21
- Stack imposé par les spécifications.
- Java 21 LTS = support long, records, pattern matching, virtual threads.
- Spring Boot 3.x = Jakarta EE 10, Native Image possible.
- Écosystème mature : Spring Security (auth), Spring Data JPA (persistence), Actuator (monitoring).

### Angular 22
- Framework opinionated → structure prévisible dans un contexte d'équipe.
- Signals (nouveau state management natif) → moins de RxJS pour du CRUD simple.
- Angular CLI génère components/services/guards/interceptors sans boilerplate.
- Router + HttpClient + Forms intégrés (pas besoin d'ajouter des libs comme en React).

### PostgreSQL
- Modèle **relationnel** naturel : `User → File → Tag`, contraintes FK, unicité email/token.
- Requêtes complexes (JOIN, agrégations pour l'historique) plus simples qu'en NoSQL.
- Extensions : `pgcrypto` pour hasher les mots de passe de fichier au niveau BDD si besoin.
- Flyway pour versionner le schéma.

### Stockage local
- MVP → suffit largement, aucune dépendance externe à administrer.
- **Abstraction** `FileStorageService` (interface) → migration vers S3 en changeant une seule implémentation.
- Path configurable via `application.yml`.

### JWT
- Imposé par les specs (US03/US04).
- Stateless → scale horizontalement sans session sticky.
- `jjwt` : lib Java de référence, HS256 signature, TTL configurable.

## Choix qualité

- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `test:`) → changelog auto possible.
- **CI GitHub Actions** : build + tests à chaque push.
- **Coverage** : JaCoCo (back), Vitest/v8 (front). Objectif 70 %.
- **Lint** : Checkstyle (back), ESLint (front).
- **k6** pour les tests de charge sur `/api/files/upload`.
