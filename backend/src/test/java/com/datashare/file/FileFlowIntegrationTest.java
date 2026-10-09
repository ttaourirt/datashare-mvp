package com.datashare.file;

import com.datashare.auth.dto.RegisterRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class FileFlowIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) throws Exception {
        registry.add("datashare.jwt.secret", () -> "integ-secret-that-is-at-least-32-chars-long-abc-xyz-123");
        Path tmp = Files.createTempDirectory("datashare-test");
        registry.add("datashare.storage.root", tmp::toString);
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired FileRepository fileRepository;
    @Autowired FileExpirationJob expirationJob;
    @Autowired JdbcTemplate jdbc;

    @Test
    void upload_thenList_thenDownload_thenDelete() throws Exception {
        String token = registerAndGetToken("owner@example.com");

        // Upload
        MockMultipartFile file = new MockMultipartFile("file", "hello.txt", "text/plain", "Hello DataShare".getBytes());
        String uploadJson = mvc.perform(multipart("/api/v1/files")
                        .file(file)
                        .param("expiresInDays", "3")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.publicToken", notNullValue()))
                .andExpect(jsonPath("$.expired").value(false))
                .andExpect(jsonPath("$.passwordProtected").value(false))
                .andReturn().getResponse().getContentAsString();

        JsonNode uploaded = json.readTree(uploadJson);
        String publicToken = uploaded.get("publicToken").asText();
        long fileId = uploaded.get("id").asLong();

        // History (US05)
        mvc.perform(get("/api/v1/files").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(fileId));

        // Public meta (US02)
        mvc.perform(get("/api/v1/public/files/" + publicToken + "/meta"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.originalName").value("hello.txt"));

        // Public download (US02) — sans mdp car pas protégé
        mvc.perform(post("/api/v1/public/files/" + publicToken + "/download")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("hello.txt")));

        // Delete (US06)
        mvc.perform(delete("/api/v1/files/" + fileId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Lien devient introuvable et les métadonnées sont supprimées
        mvc.perform(get("/api/v1/public/files/" + publicToken + "/meta"))
                .andExpect(status().isNotFound());
        assertThat(fileRepository.findById(fileId)).isEmpty();
    }

    @Test
    void upload_withTags_thenReplaceTags() throws Exception {
        String token = registerAndGetToken("tags@example.com");
        MockMultipartFile file = new MockMultipartFile("file", "tagged.txt", "text/plain", "tags".getBytes());

        // US08 — doublons ignorés (casse comprise), tags créés à la volée
        String uploadJson = mvc.perform(multipart("/api/v1/files")
                        .file(file)
                        .param("tags", "Projet", "projet", "perso")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tags", hasSize(2)))
                .andExpect(jsonPath("$.tags[*].name", containsInAnyOrder("Projet", "perso")))
                .andReturn().getResponse().getContentAsString();
        long fileId = json.readTree(uploadJson).get("id").asLong();

        // Tag > 30 caractères → 400
        mvc.perform(put("/api/v1/files/" + fileId + "/tags")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tags\":[\"" + "x".repeat(31) + "\"]}"))
                .andExpect(status().isBadRequest());

        // Remplacement des tags
        mvc.perform(put("/api/v1/files/" + fileId + "/tags")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tags\":[\"client\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tags[*].name", containsInAnyOrder("client")));

        mvc.perform(get("/api/v1/files").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].tags[*].name", containsInAnyOrder("client")));

        // Un autre utilisateur ne peut pas modifier ces tags
        String other = registerAndGetToken("intruder@example.com");
        mvc.perform(put("/api/v1/files/" + fileId + "/tags")
                        .header("Authorization", "Bearer " + other)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tags\":[\"hack\"]}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void expirationJob_purgesFileAndMetadata() throws Exception {
        String token = registerAndGetToken("purge@example.com");
        MockMultipartFile file = new MockMultipartFile("file", "old.txt", "text/plain", "old".getBytes());
        String uploadJson = mvc.perform(multipart("/api/v1/files")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long fileId = json.readTree(uploadJson).get("id").asLong();
        String publicToken = json.readTree(uploadJson).get("publicToken").asText();

        // On simule un fichier envoyé il y a 8 jours, expiré depuis hier
        jdbc.update("UPDATE files SET uploaded_at = now() - interval '8 days', expires_at = now() - interval '1 day' WHERE id = ?",
                fileId);

        // Avant purge : lien expiré → 410
        mvc.perform(get("/api/v1/public/files/" + publicToken + "/meta"))
                .andExpect(status().isGone());

        expirationJob.purgeExpired();

        assertThat(fileRepository.findById(fileId)).isEmpty();
        mvc.perform(get("/api/v1/public/files/" + publicToken + "/meta"))
                .andExpect(status().isNotFound());
    }

    @Test
    void upload_withPassword_downloadRequiresIt() throws Exception {
        String token = registerAndGetToken("secure@example.com");
        MockMultipartFile file = new MockMultipartFile("file", "secret.pdf", "application/pdf", "PDF".getBytes());
        String uploadJson = mvc.perform(multipart("/api/v1/files")
                        .file(file)
                        .param("password", "s3cret1")
                        .param("expiresInDays", "1")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.passwordProtected").value(true))
                .andReturn().getResponse().getContentAsString();
        String publicToken = json.readTree(uploadJson).get("publicToken").asText();

        // Mauvais mdp → 403
        mvc.perform(post("/api/v1/public/files/" + publicToken + "/download")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"wrong\"}"))
                .andExpect(status().isForbidden());

        // Bon mdp → 200
        mvc.perform(post("/api/v1/public/files/" + publicToken + "/download")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"s3cret1\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void upload_anonymous_worksWithoutAuth() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "anon.txt", "text/plain", "anon".getBytes());
        mvc.perform(multipart("/api/v1/public/files")
                        .file(file)
                        .param("expiresInDays", "2"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.publicToken", notNullValue()));
    }

    @Test
    void upload_blockedExtension_returns400() throws Exception {
        String token = registerAndGetToken("bad@example.com");
        MockMultipartFile file = new MockMultipartFile("file", "malware.exe", "application/octet-stream", "MZ".getBytes());
        mvc.perform(multipart("/api/v1/files")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    private String registerAndGetToken(String email) throws Exception {
        // Register (sans token) puis Login (avec token)
        var reg = new RegisterRequest(email, "password1234", null);
        mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(reg)))
                .andExpect(status().isCreated());

        String body = mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new com.datashare.auth.dto.LoginRequest(email, "password1234"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }
}
