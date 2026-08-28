package com.datashare.tag;

import com.datashare.tag.dto.TagRequest;
import com.datashare.tag.dto.TagResponse;
import com.datashare.user.User;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tags")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Tags")
public class TagController {

    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    @GetMapping
    public List<TagResponse> list(@AuthenticationPrincipal User user) {
        return tagService.listForOwner(user).stream().map(TagResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<TagResponse> create(@AuthenticationPrincipal User user,
                                              @Valid @RequestBody TagRequest req) {
        var created = tagService.create(user, req.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(TagResponse.from(created));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        tagService.delete(user, id);
        return ResponseEntity.noContent().build();
    }
}
