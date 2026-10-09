package com.datashare.file;

import com.datashare.file.dto.FileResponse;
import com.datashare.file.dto.FileTagsRequest;
import com.datashare.user.User;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/files")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Files")
public class FileController {

    private final FileService fileService;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<FileResponse> upload(@AuthenticationPrincipal User user,
                                               @RequestParam("file") MultipartFile file,
                                               @RequestParam(defaultValue = "7") int expiresInDays,
                                               @RequestParam(required = false) String password,
                                               @RequestParam(required = false) List<String> tags) throws IOException {
        FileEntity saved = fileService.upload(user, file, expiresInDays, password, tags);
        return ResponseEntity.status(HttpStatus.CREATED).body(FileResponse.from(saved));
    }

    @GetMapping
    public List<FileResponse> list(@AuthenticationPrincipal User user,
                                   @Parameter(description = "Include expired files")
                                   @RequestParam(defaultValue = "false") boolean includeExpired) {
        return fileService.history(user, includeExpired).stream().map(FileResponse::from).toList();
    }

    @PutMapping("/{id}/tags")
    public FileResponse updateTags(@AuthenticationPrincipal User user,
                                   @PathVariable Long id,
                                   @Valid @RequestBody FileTagsRequest body) {
        return FileResponse.from(fileService.updateTags(user, id, body.tags()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable Long id) throws IOException {
        fileService.delete(user, id);
        return ResponseEntity.noContent().build();
    }
}
