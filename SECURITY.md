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
| Mot de passe fichier faible | Utilisateur choisit "1234" | Validation ≥ 6 caractères. BCrypt côté back. |

## Scans

### Dépendances back (Maven)

```bash
cd backend
./mvnw org.owasp:dependency-check-maven:check
# ou GitHub Dependabot activé sur le repo
```

### Dépendances front (npm)

```bash
cd frontend
npm audit --production
```

### Résultats & décisions (à remplir après premier scan)

_À compléter à la première exécution — historiser les décisions "accepter / mettre à jour / patcher" pour chaque CVE remontée._

Exemple d'entrée type :

> **CVE-2024-XXXX** — `library@1.2.3` (severity: high).
> **Décision** : mise à jour vers `1.2.4` en même temps que le prochain sprint.
> **Justification** : correctif disponible, pas d'exploit connu en attaque.

## Bonnes pratiques appliquées

- **Mots de passe** BCrypt (users + fichiers) — strength 12.
- **Validation stricte** côté back (Bean Validation) même si le front valide déjà.
- **Handler global d'erreurs** (`GlobalExceptionHandler`) — jamais d'exception native au client.
- **Logs** : pas de mot de passe ni de token dans les logs (utiliser des placeholders SLF4J).
- **JWT secret** : lu depuis `${JWT_SECRET}` — ne jamais commit le vrai secret.
- **Configuration** : `application.yml` ne contient que des valeurs de dev ; en prod tout passe par des env vars ou un secret manager.

## À ajouter (roadmap sécurité)

- Rate limiting sur `/api/auth/*` et `/api/public/**` (bucket4j).
- Content-Security-Policy et security headers côté front (via Nginx).
- Rotation périodique du secret JWT.
- Antivirus scan des uploads (ClamAV).
- Audit log des actions sensibles (delete, download admin).
