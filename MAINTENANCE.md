# MAINTENANCE.md — Maintenance et évolution

## Politique de mise à jour des dépendances

| Type | Fréquence | Outil | Risque |
|---|---|---|---|
| **Patches** (x.y.**Z**) | Automatique (Dependabot / Renovate hebdomadaire) | Dependabot | Faible — bugfixes et correctifs sécurité |
| **Minor** (x.**Y**.z) | Chaque sprint (2 semaines) | Revue manuelle du PR | Faible — nouveautés compatibles |
| **Major** (**X**.y.z) | Trimestriel ou sur besoin | Ticket dédié + tests étendus | Élevé — breaking changes possibles |
| **Java LTS** | Suivre les LTS (21 → 25) | Ticket dédié | Élevé — refonte config possible |
| **Angular** | Rester sur une version supportée (passé de 18 à 22 le 2026-10-09) | `ng update` une majeure à la fois + revue | Moyen — migrations guidées |
| **Spring Boot** | Rester sur une version supportée (3.3 → 3.5.16 le 2026-10-09 ; Spring Boot 4 à planifier) | Migration guide + tests | Moyen (Élevé pour 3 → 4 : Jakarta/Spring 7) |

## Comment vérifier

### Back
```bash
cd backend
./mvnw versions:display-dependency-updates      # nouvelles minor/major
./mvnw versions:display-plugin-updates
osv-scanner scan source -r .                     # CVE (cf. SECURITY.md)
```

### Front
```bash
cd frontend
npm outdated                                    # nouvelles versions
npm audit                                       # CVE
ng update                                       # migrations Angular guidées
```

## Sauvegarde & restauration

### Base de données
```bash
# Backup quotidien
docker exec datashare-db pg_dump -U datashare datashare > backups/dump-$(date +%F).sql

# Restauration
docker exec -i datashare-db psql -U datashare datashare < backups/dump-YYYY-MM-DD.sql
```

### Fichiers uploadés
```bash
# Répertoire ./storage/uploads (dev) ou volume monté (prod)
rsync -av storage/uploads/ backups/uploads-$(date +%F)/
```

En prod : bucket S3 avec versioning activé (règle de vie 30 jours).

## Procédure de déploiement (cible — CI et images Docker pas encore en place)

1. Merge sur `main` → CI verte
2. GitHub Actions build les images Docker `backend:X.Y.Z` et `frontend:X.Y.Z`
3. Push sur registry
4. Deploy sur env de staging → smoke tests (les scénarios E2E Cypress)
5. Deploy prod → migration Flyway idempotente au démarrage
6. Health check : `GET /actuator/health` doit retourner 200

## Logs

- **Back** : SLF4J + Logback. Level configurable via `LOGGING_LEVEL_ROOT`. Format JSON en prod (logstash-logback-encoder à ajouter).
- **Front** : les erreurs non-catch remontent dans la console navigateur ; roadmap : Sentry.

## Monitoring

- **Actuator** (en place) : `/actuator/health` public, `/actuator/metrics` protégé par JWT. Métrique applicative `datashare.upload.size`. À ajouter : `/actuator/prometheus`.
- **Uptime** : ping externe (UptimeRobot ou équivalent).
- **Alertes** : à connecter à Slack / email (roadmap Prometheus + Alertmanager).

## Rituel de mise à jour (mensuel, ~1 h)

1. `osv-scanner scan source -r backend` et `cd frontend && npm audit` : comparer avec [`docs/reports/security/`](docs/reports/security/).
2. Patches et mineures : mettre à jour, puis lancer `./mvnw verify`, `npm test -- --watch=false` et `npm run e2e:run`.
3. Majeures (Angular, Spring Boot) : branche dédiée, une majeure à la fois, relancer aussi le test k6 (PERF.md) et Lighthouse.
4. Mettre à jour SECURITY.md (résultats et décisions) et retirer les surcharges de versions du `pom.xml` devenues inutiles.

## Runbook incident

| Symptôme | Diagnostic rapide | Action |
|---|---|---|
| API répond 5xx | `docker logs datashare-backend` | Redémarrer container, lire stack trace |
| BDD saturée | `pg_stat_activity` | Kill requêtes long-running, vérifier index |
| Disque plein | `df -h storage/uploads` | Lancer manuellement `FileExpirationJob`, augmenter volume |
| Timeouts upload | Log Nginx | Augmenter `client_max_body_size` du reverse proxy |
| Token JWT tous rejetés | Vérifier `JWT_SECRET` | Restaurer le secret; les users devront se relogger |

## Contact & responsabilités

- **Référent technique** : Taoufik Taourirt
- **Escalade** : lead PO Lisa (DataShare)
- **Issues** : GitHub Issues du repo `datashare-mvp`
