package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.dto.CommentResponseDto;
import com.bookigma.bookigma.dto.PostRequestDto;
import com.bookigma.bookigma.service.PostService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.io.IOException;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/posts")
@CrossOrigin(origins = "*")
public class PostController {
    private final PostService postService;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    public PostController(PostService postService) { this.postService = postService; }

    @GetMapping
    public ResponseEntity<?> getAllPosts(@CurrentUserId(required = false) Long currentUserId) {
        return ResponseEntity.ok(postService.getAllPosts(currentUserId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getPostsByUser(@PathVariable Long userId, @CurrentUserId(required = false) Long currentUserId) {
        return ResponseEntity.ok(postService.getPostsByUser(userId, currentUserId));
    }

    /** Upload ảnh bài viết từ file máy người dùng; DB chỉ lưu đường dẫn tương đối. */
    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadPostImage(
            @CurrentUserId Long currentUserId,
            @RequestParam("file") MultipartFile file
    ) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng chọn ảnh bài viết."));
        }
        if (file.getSize() > 10L * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ảnh bài viết không được vượt quá 10 MB."));
        }

        String extension;
        String contentType = file.getContentType();
        if ("image/jpeg".equalsIgnoreCase(contentType)) extension = ".jpg";
        else if ("image/png".equalsIgnoreCase(contentType)) extension = ".png";
        else if ("image/webp".equalsIgnoreCase(contentType)) extension = ".webp";
        else if ("image/gif".equalsIgnoreCase(contentType)) extension = ".gif";
        else return ResponseEntity.badRequest().body(Map.of("message", "Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF."));

        Path directory = Paths.get(uploadDir).toAbsolutePath().normalize().resolve("posts").normalize();
        String filename = UUID.randomUUID() + extension;
        Path destination = directory.resolve(filename).normalize();
        if (!destination.startsWith(directory)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên file không hợp lệ."));
        }
        try {
            Files.createDirectories(directory);
            file.transferTo(destination);
            return ResponseEntity.ok(Map.of("imageUrl", "/uploads/posts/" + filename));
        } catch (IOException ex) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Không thể lưu ảnh bài viết trên máy chủ."));
        }
    }

    @PostMapping
    public ResponseEntity<?> createPost(@CurrentUserId Long currentUserId, @Valid @RequestBody PostRequestDto request) {
        try { return ResponseEntity.status(201).body(postService.createPost(currentUserId, request)); }
        catch (IllegalArgumentException ex) { return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage())); }
    }

    public record ReactionRequest(String type) {}

    @PostMapping("/{postId}/reactions")
    public ResponseEntity<?> reactToPost(@CurrentUserId Long currentUserId,
                                         @PathVariable Long postId,
                                         @RequestBody(required = false) ReactionRequest request) {
        try {
            return ResponseEntity.ok(postService.reactToPost(currentUserId, postId, request == null ? null : request.type()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/comments/{commentId}/reactions")
    public ResponseEntity<?> reactToComment(@CurrentUserId Long currentUserId,
                                            @PathVariable Long commentId,
                                            @RequestBody(required = false) ReactionRequest request) {
        try {
            return ResponseEntity.ok(postService.reactToComment(currentUserId, commentId, request == null ? null : request.type()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    public record CommentRequest(String content, Long parentCommentId) {}

    @PostMapping("/{postId}/comments")
    public ResponseEntity<?> addComment(@CurrentUserId Long currentUserId, @PathVariable Long postId, @RequestBody CommentRequest request) {
        try {
            CommentResponseDto result = postService.addComment(currentUserId, postId, request == null ? null : request.content(), request == null ? null : request.parentCommentId());
            return ResponseEntity.status(201).body(result);
        } catch (IllegalArgumentException ex) { return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage())); }
    }
}
