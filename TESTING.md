# TESTING.md — Plan de tests

## Vue d'ensemble

| Type | Techno | Emplacement | Objectif |
|---|---|---|---|
| Unit back | JUnit 5 + Mockito + AssertJ | `backend/src/test/java/**/*Test.java` (hors `*IntegrationTest`) | Services + policies isolés |
| Intégration back | @SpringBootTest + MockMvc + Testcontainers (Postgres 16) | `backend/src/test/java/**/*IntegrationTest.java` | Flux HTTP réels de bout en bout, vraie BDD |
| Unit front | Karma + Jasmine + `HttpTestingController` | `frontend/src/**/*.spec.ts` | Services / stores / guards |
| E2E | Cypress | `frontend/cypress/e2e/*.cy.ts` | 2-3 scénarios critiques |

## Critères d'acceptation

- Tous les tests **passent en CI** avant merge sur `main`.
- **Couverture ≥ 70 %** (JaCoCo pour le back, Karma coverage pour le front).
- Chaque US du MVP possède au moins **un test unitaire** et **un test d'intégration ou E2E**.
- Toute correction de bug est accompagnée d'un test qui échoue avant la correction.

## Scénarios critiques couverts par les tests d'intégration back

`FileFlowIntegrationTest` :
1. **US01 + US05 + US06 + US02** — upload → list → public meta → download → delete → 404
2. **US09** — upload avec mot de passe → mauvais mdp = 403 → bon mdp = 200
3. **US07** — upload anonyme sans header Authorization
4. **US01** — extension bloquée (`.exe`) → 400

`AuthIntegrationTest` :
5. **US03 + US04** — register → login → `/me`
6. **US03** — email dupliqué → 409
7. **US03** — email invalide → 400
8. **US04** — mauvais mot de passe → 401

## Scénarios E2E (Cypress) à implémenter

1. **Inscription + upload + partage** — un user crée un compte, upload un fichier, copie le lien, l'ouvre en navigation privée.
2. **Upload anonyme + téléchargement protégé par mot de passe** — un visiteur envoie un fichier avec mdp, un autre le télécharge après avoir saisi le bon mdp.
3. **Suppression** — un user supprime un fichier, l'ancien lien renvoie 404.

## Instructions d'exécution

### Back
```bash
cd backend
./mvnw verify          # unit + intégration + rapport JaCoCo dans target/site/jacoco/
open target/site/jacoco/index.html
```

### Front unit
```bash
cd frontend
npm test               # ouvre Karma en watch — génère coverage/
open coverage/index.html
# ou pour CI :
npm test -- --watch=false --browsers=ChromeHeadless
```

### E2E
```bash
cd frontend
npm run e2e            # ouvre Cypress
```

## Rapport de couverture

- **Back** : rapport HTML sous `backend/target/site/jacoco/index.html` (après `mvn verify`).
- **Front** : rapport HTML sous `frontend/coverage/index.html` (après `npm test`).

Une capture d'écran de chaque rapport doit être annexée à la livraison finale.
