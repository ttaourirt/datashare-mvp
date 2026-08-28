package com.datashare.file;

import com.datashare.file.dto.DownloadRequest;
import com.datashare.file.dto.FileResponse;
import com.datashare.file.dto.PublicFileMeta;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public")
@Tag(name = "Public")
public class PublicFileController {

    private final FileService fileService;

    public PublicFileController(FileService fileService) {
        this.fileService = fileService;
    }

    // US02 — métadonnées visibles avant le téléchargement
    @GetMapping("/files/{token}/meta")
    public PublicFileMeta meta(@PathVariable UUID token) {
        return PublicFileMeta.from(fileService.findPublicByToken(token));
    }

    // US02 — téléchargement effectif (POST car peut porter un mot de passe)
    @PostMapping("/files/{token}/download")
    public ResponseEntity<InputStreamResource> download(@PathVariable UUID token,
                                                        @RequestBody(required = false) DownloadRequest body,
                                                        HttpServletRequest request) throws IOException {
        String password = body == null ? null : body.password();
        FileEntity file = fileService.authorizeDownload(token, password, clientIp(request));
        InputStream stream = fileService.openStream(file);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(file.getMimeType()));
        headers.setContentDispositionFormData("attachment", file.getOriginalName());
        headers.setContentLength(file.getSizeBytes());
        return new ResponseEntity<>(new InputStreamResource(stream), headers, HttpStatus.OK);
    }

    // US07 — upload anonyme (pas d'auth requise)
    @PostMapping(value = "/files", consumes = "multipart/form-data")
    public ResponseEntity<FileResponse> uploadAnonymous(@RequestParam("file") MultipartFile file,
                                                        @RequestParam(defaultValue = "7") int expiresInDays,
                                                        @RequestParam(required = false) String password) throws IOException {
        FileEntity saved = fileService.upload(null, file, expiresInDays, password, null);
        return ResponseEntity.status(HttpStatus.CREATED).body(FileResponse.from(saved));
    }

    private static String clientIp(HttpServletRequest request) {
        return Optional.ofNullable(request.getHeader("X-Forwarded-For"))
                .map(h -> h.split(",")[0].trim())
                .filter(s -> !s.isBlank())
                .orElseGet(request::getRemoteAddr);
    }
}
