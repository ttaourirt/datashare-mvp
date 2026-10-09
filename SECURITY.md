# SECURITY.md — Garantis de sécurité

## Modèle de menace (résumé)

| Menace | Vecteur | Mitigation |
|---|---|---|
| Vol de compte | Brute-force login | Throttle à ajouter (bucket4j) — roadmap. BCrypt 12 rounds. |
| Rejeu de token volé | XSS ou man-in-the-middle | Expiration JWT 24h. HTTPS obligatoire en prod. Roadmap : cookie httpOnly. |
| Path traversal upload | `../../etc/passwd` en filename | `LocalFileStorage.resolve()` valide que le chemin final reste sous `root`. Nom de stockage = UUID, jamais le nom user. |
| Exécution arbitraire | Upload d'un binaire malveillant | Blocklist extensions : `.exe .bat .cmd .com .cpl .msi .ps1 .sh .vbs .js .jar .scr`. |
| Accès non autorisé aux fichiers | Deviner un ID de fichier | Endpoints privés = filtre par `owner_id`. Endpoints publics = UUID v4 non prédictible (122 bits). |
| Fuite de données post-expiration | Fichier resté sur disque | Job `@Scheduled` quotidien supprime le blob **et** la ligne en BDD. |
| SQL injection | Requête concaténée | Uniquement Spring Data JPA + JPQL paramétré, jamais de string concat. |
| CSRF | POST cross-origin | API stateless (JWT en header) → pas de cookie session → pas de vecteur CSRF. |
| CORS trop laxiste | `Access-Control-Allow-Origin: *` | `SecurityConfig.corsConfigurationSource()` limite à l'origine du front (`datashare.cors.allowed-origins`). |
| Mot de passe fichier faible | Utilisateur choisit "1234" | Validation ≥ 6 caractères (client + serveur). BCrypt côté back. |
| XSS | Nom de fichier ou tag malveillant affiché dans l'UI | Interpolation Angular (échappement automatique), aucun `innerHTML` sur une donnée utilisateur (seules les icônes SVG constantes sont injectées). |
| Fichier trop volumineux | Saturation disque / mémoire | Limite 1 Go vérifiée côté client, par Spring (`max-file-size`), par `UploadPolicy` et par une contrainte SQL ; écriture en streaming. |

## Scans de sécurité (2026-10-09)

### Outils et commandes

| Périmètre | Outil | Commande |
|---|---|---|
| Dépendances back (Maven, transitives incluses) | [OSV-Scanner](https://google.github.io/osv-scanner/) 2.6 | `osv-scanner scan source -r backend` |
| Dépendances front (npm) | `npm audit` | `cd frontend && npm audit --omit=dev` puis `npm audit` |

OSV-Scanner interroge la base [osv.dev](https://osv.dev) (GitHub Advisories, NVD…) et résout l'arbre Maven complet.
Il remplace OWASP Dependency-Check, qui impose le téléchargement complet de la base NVD (plusieurs heures sans clé API).

Rapports bruts : [`docs/reports/security/`](docs/reports/security/).

### Résultats

| Scan | Avant | Après | Rapport |
|---|---|---|---|
| Back — OSV (Spring Boot 3.3.5) | **96** vulnérabilités (12 critiques, 35 hautes) sur 23 paquets | **2** (non exploitables, voir ci-dessous) | [avant](docs/reports/security/osv-backend-before.txt) · [après](docs/reports/security/osv-backend-after.txt) |
| Front — `npm audit --omit=dev` (Angular 18.2) | **8** (4 hautes, 4 modérées) — 18 avis Angular dont plusieurs XSS | **0** | [avant](docs/reports/security/npm-audit-prod-before.txt) · [après](docs/reports/security/npm-audit-after.txt) |
| Front — `npm audit` (outillage de dev inclus) | **80** (4 critiques, 46 hautes) | **0** | [avant](docs/reports/security/npm-audit-all-before.txt) · [après](docs/reports/security/npm-audit-after.txt) |

### Analyse et décisions

| Constat | Décision | Justification |
|---|---|---|
| Spring Boot 3.3.5 n'est plus maintenu : Spring Security (contournement d'autorisation, CVSS 9.1), Spring MVC, Tomcat, driver PostgreSQL… | **Mise à jour** vers Spring Boot **3.5.16** (même branche majeure 3.x) | Correctifs publiés, migration mineure sans changement d'API ; les 25 tests back passent sans modification. |
| Correctifs de sécurité plus récents que le BOM Spring Boot (Jackson 2.21.7, Tomcat 10.1.60, PostgreSQL 42.7.12, log4j-api 2.25.5, commons-lang3 3.18.0, commons-compress 1.26.2 en test) | **Surcharge des versions** dans `pom.xml` (propriétés du BOM + `dependencyManagement`) | Versions patch compatibles ; à retirer quand le BOM Spring Boot les intégrera. |
| Angular 18 n'est plus maintenu : 18 avis (XSS via SVG/MathML/i18n, fuite de jeton XSRF, DoS) | **Mise à jour** Angular 18 → **22** via `ng update` (une version majeure à la fois) | Pas de correctif sur la branche 18. L'application est petite (composants standalone + signals) : migrations automatiques, tests unitaires et E2E verts. |
| Karma (déprécié) et l'ancienne chaîne webpack tirent `braces`, `http-proxy-middleware`… | **Remplacement** : builder `@angular/build` (esbuild/Vite), tests unitaires **Vitest**, Cypress 13 → 16 | Outillage recommandé par Angular 22 ; supprime toute la chaîne vulnérable. |
| `spring-webmvc` 6.2.19 — [GHSA-pc63-qcmh-9cmg](https://osv.dev/GHSA-pc63-qcmh-9cmg) (`XsltView`) et [GHSA-j9f9-w8pj-32f8](https://osv.dev/GHSA-j9f9-w8pj-32f8) (SSE + fragments de vue) | **Risque accepté**, réévalué à chaque scan | Correctif uniquement en Spring Framework 7 (Spring Boot 4, migration majeure). DataShare n'utilise ni `XsltView` ni Server-Sent Events ni vues serveur : API REST JSON uniquement (vérifié : aucune occurrence de `Xslt`, `SseEmitter`, `text/event-stream`). Migration Spring Boot 4 planifiée (cf. MAINTENANCE.md). |
| Avis Tomcat sur l'authentification DIGEST/FORM et les contraintes `web.xml` | Corrigé par Tomcat 10.1.60 ; de toute façon non applicable | L'authentification passe par Spring Security + JWT, pas par les mécanismes de Tomcat. |

### Contrôles complémentaires

- **Accessibilité / bonnes pratiques navigateur** : Lighthouse « Best Practices » = 100 (aucune bibliothèque vulnérable détectée côté client, pas d'erreur console).
- **Endpoints techniques** : `/actuator/health` public (sonde), `/actuator/metrics` protégé par JWT (`401` sans jeton), Swagger à désactiver en production (`springdoc.api-docs.enabled=false`).

## Bonnes pratiques appliquées

- **Mots de passe** BCrypt (users + fichiers) — strength 12.
- **Validation stricte** côté back (Bean Validation) même si le front valide déjà.
- **Handler global d'erreurs** (`GlobalExceptionHandler`) — jamais d'exception native au client.
- **Logs** : pas de mot de passe ni de token dans les logs (utiliser des placeholders SLF4J).
- **JWT secret** : lu depuis `${JWT_SECRET}` — ne jamais commit le vrai secret.
- **Configuration** : `application.yml` ne contient que des valeurs de dev ; en prod tout passe par des env vars ou un secret manager.

## À ajouter (roadmap sécurité)

- Rate limiting sur `/api/v1/auth/*` et `/api/v1/public/**` (bucket4j).
- Migration Spring Boot 4 / Spring Framework 7 (lève les 2 avis `spring-webmvc` acceptés).
- Content-Security-Policy et security headers côté front (via Nginx).
- Rotation périodique du secret JWT.
- Antivirus scan des uploads (ClamAV).
- Audit log des actions sensibles (delete, download admin).
