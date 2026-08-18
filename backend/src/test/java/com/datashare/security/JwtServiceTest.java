package com.datashare.security;

import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "unit-test-secret-must-be-at-least-32-chars-long-abc123";
    private final JwtService jwt = new JwtService(SECRET, 24);

    @Test
    void generateAndParse_roundtrip() {
        String token = jwt.generate(42L, "alice@example.com");
        Long userId = jwt.extractUserId(token);
        assertThat(userId).isEqualTo(42L);
    }

    @Test
    void extractUserId_tampered_throws() {
        String token = jwt.generate(1L, "x@y.z");
        String tampered = token.substring(0, token.length() - 4) + "abcd";
        assertThatThrownBy(() -> jwt.extractUserId(tampered))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void extractUserId_wrongSecret_throws() {
        String token = jwt.generate(1L, "x@y.z");
        JwtService other = new JwtService("another-secret-that-is-at-least-32-chars-long-xyz", 24);
        assertThatThrownBy(() -> other.extractUserId(token))
                .isInstanceOf(JwtException.class);
    }
}
