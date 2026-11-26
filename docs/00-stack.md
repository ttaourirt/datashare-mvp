# Choix du stack technique

## Résumé

| Couche | Technologie | Version |
|---|---|---|
| Back-end | Spring Boot | 3.5.x (Java 21 LTS) |
| Build back | Maven | 3.9.x |
| Front-end | Angular | 22 (standalone components, signals) |
| Base de données | PostgreSQL | 16 |
| Migrations SQL | Flyway | 11.x |
| Auth | JWT (jjwt) | 0.12.x |
| Stockage fichiers | Système de fichiers local (`./storage/uploads`) | — |
| API doc | SpringDoc OpenAPI | 2.8.x → Swagger UI auto |
| Tests back | JUnit 5 + Mockito + Testcontainers | — |
| Tests front | Vitest (unit) + Cypress 16 (E2E) | — |
| CI | GitHub Actions | — |
| Déploiement | Docker Compose (PostgreSQL, back, front servi par Nginx) | — |

## Justifications

### Spring Boot + Java 21
- Une des options proposées par les spécifications, la plus complète pour ce besoin (sécurité, accès BDD, supervision intégrés).
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
- `jjwt` : lib Java de référence, signature HMAC-SHA (l'algorithme dépend de la longueur du secret), durée de vie configurable.

## Choix qualité

- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `test:`) → changelog auto possible.
- **CI GitHub Actions** (`.github/workflows/ci.yml`) : tests back et front + build de production à chaque push et pull request.
- **Coverage** : JaCoCo (back), Vitest/v8 (front). Objectif 70 %.
- **Lint** : pas de linter dédié pour l'instant. TypeScript est en mode strict (`strict`, `strictTemplates`) et le compilateur Java fait les contrôles de base. ESLint et Checkstyle sont à ajouter.
- **k6** pour les tests de charge sur l'historique (`GET /api/v1/files`) et le téléchargement public (voir PERF.md).
- **Docker** : un Dockerfile pour le back, un pour le front (Nginx), `docker-compose.yml` et `scripts/deploy.sh` pour tout lancer.
