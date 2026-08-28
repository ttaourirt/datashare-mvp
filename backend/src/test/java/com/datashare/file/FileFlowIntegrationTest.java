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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.file.Files;
import java.nio.file.Path;

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

        // Lien devient introuvable
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
        var req = new RegisterRequest(email, "password1234", null);
        String body = mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }
}
