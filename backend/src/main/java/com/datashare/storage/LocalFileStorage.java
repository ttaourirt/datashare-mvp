package com.datashare.storage;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.UUID;

@Service
public class LocalFileStorage implements FileStorageService {

    private final Path root;

    public LocalFileStorage(@Value("${datashare.storage.root}") String rootPath) {
        this.root = Paths.get(rootPath).toAbsolutePath().normalize();
    }

    @PostConstruct
    void init() throws IOException {
        Files.createDirectories(root);
    }

    @Override
    public String store(InputStream in, String originalName) throws IOException {
        String ext = extractExtension(originalName);
        String relative = UUID.randomUUID() + (ext.isEmpty() ? "" : "." + ext);
        Path target = root.resolve(relative);
        Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        return relative;
    }

    @Override
    public InputStream open(String relativePath) throws IOException {
        return Files.newInputStream(resolve(relativePath));
    }

    @Override
    public void delete(String relativePath) throws IOException {
        Files.deleteIfExists(resolve(relativePath));
    }

    @Override
    public long size(String relativePath) throws IOException {
        return Files.size(resolve(relativePath));
    }

    /** Empêche les path traversal (`..`) — le chemin résolu DOIT rester sous root. */
    private Path resolve(String relativePath) {
        Path resolved = root.resolve(relativePath).normalize();
        if (!resolved.startsWith(root)) {
            throw new SecurityException("Illegal path: " + relativePath);
        }
        return resolved;
    }

    private static String extractExtension(String name) {
        if (name == null) return "";
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) return "";
        return name.substring(dot + 1).toLowerCase();
    }
}
