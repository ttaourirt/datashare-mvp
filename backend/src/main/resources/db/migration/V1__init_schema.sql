-- users
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(72)  NOT NULL,
    name          VARCHAR(100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

-- tags
CREATE TABLE tags (
    id       BIGSERIAL PRIMARY KEY,
    owner_id BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name     VARCHAR(30) NOT NULL,
    CONSTRAINT uq_tags_owner_name UNIQUE (owner_id, name)
);

-- files
CREATE TABLE files (
    id                     BIGSERIAL PRIMARY KEY,
    public_token           UUID         NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    owner_id               BIGINT       REFERENCES users(id) ON DELETE CASCADE,
    original_name          VARCHAR(255) NOT NULL,
    storage_path           VARCHAR(500) NOT NULL,
    mime_type              VARCHAR(100) NOT NULL,
    size_bytes             BIGINT       NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 1073741824),
    download_password_hash VARCHAR(72),
    uploaded_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at             TIMESTAMPTZ  NOT NULL,
    deleted                BOOLEAN      NOT NULL DEFAULT false,
    CONSTRAINT ck_files_expiration CHECK (expires_at > uploaded_at)
);

CREATE INDEX idx_files_owner   ON files (owner_id);
CREATE INDEX idx_files_expires ON files (expires_at) WHERE deleted = false;

-- file_tags
CREATE TABLE file_tags (
    file_id BIGINT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    tag_id  BIGINT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (file_id, tag_id)
);

-- download_events
CREATE TABLE download_events (
    id            BIGSERIAL PRIMARY KEY,
    file_id       BIGINT      NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    ip            VARCHAR(45) NOT NULL,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    password_ok   BOOLEAN     NOT NULL
);

CREATE INDEX idx_download_events_file ON download_events (file_id);
