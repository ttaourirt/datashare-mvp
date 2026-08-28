package com.datashare.file;

import com.datashare.common.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UploadPolicyTest {

    private final UploadPolicy policy = new UploadPolicy();

    @Test
    void validate_happyPath_noPassword() {
        assertThatCode(() -> policy.validate("report.pdf", 1024, 7, null)).doesNotThrowAnyException();
    }

    @Test
    void validate_happyPath_withPassword() {
        assertThatCode(() -> policy.validate("report.pdf", 1024, 3, "abcdef")).doesNotThrowAnyException();
    }

    @Test
    void validate_blockedExtension() {
        assertThatThrownBy(() -> policy.validate("virus.EXE", 100, 3, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("not allowed");
    }

    @Test
    void validate_tooBig() {
        assertThatThrownBy(() -> policy.validate("big.mp4", UploadPolicy.MAX_SIZE_BYTES + 1, 3, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("1 GB");
    }

    @Test
    void validate_empty() {
        assertThatThrownBy(() -> policy.validate("empty.txt", 0, 3, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Empty");
    }

    @Test
    void validate_expirationOutOfRange() {
        assertThatThrownBy(() -> policy.validate("ok.pdf", 100, 8, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("1 and 7");
        assertThatThrownBy(() -> policy.validate("ok.pdf", 100, 0, null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void validate_passwordTooShort() {
        assertThatThrownBy(() -> policy.validate("ok.pdf", 100, 3, "abc"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("6 characters");
    }
}
