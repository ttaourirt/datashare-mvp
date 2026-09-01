package com.datashare.auth;

import com.datashare.auth.dto.LoginRequest;
import com.datashare.auth.dto.RegisterRequest;
import com.datashare.security.JwtService;
import com.datashare.user.User;
import com.datashare.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtService jwtService;

    @InjectMocks AuthService authService;

    @Test
    void register_success_returnsUser() {
        RegisterRequest req = new RegisterRequest("alice@example.com", "password123", "Alice");
        when(userRepository.existsByEmailIgnoreCase("alice@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hash");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });

        var resp = authService.register(req);

        assertThat(resp.id()).isEqualTo(1L);
        assertThat(resp.email()).isEqualTo("alice@example.com");
        assertThat(resp.name()).isEqualTo("Alice");
        verifyNoInteractions(jwtService); // pas de token à l'inscription
    }

    @Test
    void register_emailTaken_throws() {
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(true);
        assertThatThrownBy(() -> authService.register(
                new RegisterRequest("bob@example.com", "password123", null)))
                .isInstanceOf(EmailAlreadyUsedException.class);
    }

    @Test
    void login_success_returnsToken() {
        User existing = User.builder().id(7L).email("carol@example.com").passwordHash("hash").build();
        when(userRepository.findByEmailIgnoreCase("carol@example.com")).thenReturn(Optional.of(existing));
        when(passwordEncoder.matches("password123", "hash")).thenReturn(true);
        when(jwtService.generate(7L, "carol@example.com")).thenReturn("jwt");

        var resp = authService.login(new LoginRequest("carol@example.com", "password123"));

        assertThat(resp.token()).isEqualTo("jwt");
        assertThat(resp.user().id()).isEqualTo(7L);
    }

    @Test
    void login_wrongPassword_throws() {
        User existing = User.builder().id(1L).email("d@x.com").passwordHash("hash").build();
        when(userRepository.findByEmailIgnoreCase("d@x.com")).thenReturn(Optional.of(existing));
        when(passwordEncoder.matches("bad", "hash")).thenReturn(false);
        assertThatThrownBy(() -> authService.login(new LoginRequest("d@x.com", "bad")))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_userNotFound_throws() {
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> authService.login(new LoginRequest("nope@x.com", "any")))
                .isInstanceOf(InvalidCredentialsException.class);
    }
}
