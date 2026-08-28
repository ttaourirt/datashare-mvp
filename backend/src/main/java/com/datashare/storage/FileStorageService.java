package com.datashare.storage;

import java.io.IOException;
import java.io.InputStream;

/**
 * Abstraction sur le stockage physique. Une implémentation locale ({@link LocalFileStorage})
 * suffit pour le MVP ; une future implémentation S3 se branche sans toucher au reste du code.
 */
public interface FileStorageService {

    /** Écrit le flux dans le stockage et renvoie le chemin relatif (à persister en BDD). */
    String store(InputStream in, String originalName) throws IOException;

    /** Ouvre un stream de lecture sur un fichier précédemment stocké. */
    InputStream open(String relativePath) throws IOException;

    /** Supprime le fichier. No-op si absent. */
    void delete(String relativePath) throws IOException;

    /** Taille en octets (utile pour audit / logs). */
    long size(String relativePath) throws IOException;
}
