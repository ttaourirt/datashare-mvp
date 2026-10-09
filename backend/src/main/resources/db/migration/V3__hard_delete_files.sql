-- US01 / US06 / US10 : la suppression (manuelle ou à expiration) retire le fichier
-- ET ses métadonnées. Le soft delete n'a plus lieu d'être.
DELETE FROM files WHERE deleted = true;
DROP INDEX IF EXISTS idx_files_expires;
ALTER TABLE files DROP COLUMN deleted;
CREATE INDEX idx_files_expires ON files (expires_at);
