# Modèle de données

## MCD

```mermaid
erDiagram
    USER ||--o{ FILE : "possède"
    FILE ||--o{ FILE_TAG : "tagué par"
    TAG  ||--o{ FILE_TAG : "attache"
    FILE ||--o{ DOWNLOAD_EVENT : "génère"

    USER {
        bigint id PK
        string email UK "unique, format email"
        string password_hash "BCrypt"
        string name
        timestamp created_at
    }

    FILE {
        bigint id PK
        uuid public_token UK "identifiant partagé"
        bigint owner_id FK "NULL si anonyme (US07)"
        string original_name
        string storage_path "relatif à FILE_STORAGE_ROOT"
        string mime_type
        bigint size_bytes
        string download_password_hash "NULL si pas protégé"
        timestamp uploaded_at
        timestamp expires_at
        boolean deleted "soft delete pour audit"
    }

    TAG {
        bigint id PK
        bigint owner_id FK
        string name "max 30 chars"
    }

    FILE_TAG {
        bigint file_id PK, FK
        bigint tag_id PK, FK
    }

    DOWNLOAD_EVENT {
        bigint id PK
        bigint file_id FK
        string ip
        timestamp downloaded_at
        boolean password_ok "false si mauvais mdp"
    }
```

## Tables PostgreSQL

### `users`

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL |
| `password_hash` | VARCHAR(72) | NOT NULL (BCrypt = 60 chars, marge) |
| `name` | VARCHAR(100) | NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Index : `idx_users_email` (déjà via UNIQUE).

### `files`

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `public_token` | UUID | UNIQUE, NOT NULL, DEFAULT gen_random_uuid() |
| `owner_id` | BIGINT | FK users(id) ON DELETE CASCADE, NULL (anon possible pour US07) |
| `original_name` | VARCHAR(255) | NOT NULL |
| `storage_path` | VARCHAR(500) | NOT NULL |
| `mime_type` | VARCHAR(100) | NOT NULL |
| `size_bytes` | BIGINT | NOT NULL, CHECK <= 1_073_741_824 (1 GB) |
| `download_password_hash` | VARCHAR(72) | NULL |
| `uploaded_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `expires_at` | TIMESTAMPTZ | NOT NULL, CHECK expires_at > uploaded_at |
| `deleted` | BOOLEAN | NOT NULL DEFAULT false |

Index :
- `idx_files_owner` sur `owner_id`
- `idx_files_expires` sur `expires_at` (utilisé par le job de purge)
- `idx_files_token` (via UNIQUE)

### `tags`

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `owner_id` | BIGINT | FK users(id) ON DELETE CASCADE, NOT NULL |
| `name` | VARCHAR(30) | NOT NULL |

Contrainte : `UNIQUE(owner_id, LOWER(name))` — pas de doublon de tag chez un user.

### `file_tags`

Table de jointure many-to-many.

| Colonne | Type | Contraintes |
|---|---|---|
| `file_id` | BIGINT | FK files(id) ON DELETE CASCADE, PK partiel |
| `tag_id` | BIGINT | FK tags(id) ON DELETE CASCADE, PK partiel |

### `download_events` (traçabilité — utile pour PERF.md et debug)

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `file_id` | BIGINT | FK files(id) ON DELETE CASCADE |
| `ip` | VARCHAR(45) | NOT NULL (IPv6 max 45) |
| `downloaded_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `password_ok` | BOOLEAN | NOT NULL |

## Règles dérivées des US

| Règle | Colonnes impliquées |
|---|---|
| Email unique (US03) | `users.email UNIQUE` |
| Password hashé (US03) | `users.password_hash` BCrypt |
| JWT stateless (US04) | Pas de table token — payload JWT contient `userId` |
| Expiration 7j max (US01) | Check applicatif + `expires_at` calculé au serveur |
| Fichier lié à user (US01) | `files.owner_id` NOT NULL en mode connecté |
| Historique (US05) | Requête `SELECT * FROM files WHERE owner_id=? AND deleted=false` |
| Suppression physique (US06) | `deleted=true` + delete filesystem (soft delete pour audit) |
| Mot de passe fichier (US09) | `download_password_hash` BCrypt |
| Purge auto (US10) | Job `@Scheduled(cron="0 0 3 * * *")` → WHERE expires_at < now() |
| Tags 0..N (US08) | Table de jointure `file_tags` |

## Choix de conception

- **UUID pour `public_token`** : non prédictible (spec US02) — 122 bits d'entropie, impossible à brute-forcer.
- **Soft delete** sur `files` (`deleted` booléen) : permet audit et debug après incident, purge physique par le cron.
- **`owner_id` NULL** possible : ouvre la porte à US07 (upload anonyme) sans refonte du schéma.
- **`download_events`** séparé de `files` : simplifie l'audit, permet du reporting agrégé (nb DL, taux d'échec password).
