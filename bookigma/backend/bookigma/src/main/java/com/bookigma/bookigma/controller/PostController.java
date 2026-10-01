package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.dto.CommentResponseDto;
import com.bookigma.bookigma.dto.PostRequestDto;
import com.bookigma.bookigma.service.PostService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/posts")
@CrossOrigin(origins = "*")
public class PostController {
    private final PostService postService;

    public PostController(PostService postService) { this.postService = postService; }

    @GetMapping
    public ResponseEntity<?> getAllPosts(@CurrentUserId(required = false) Long currentUserId) {
        return ResponseEntity.ok(postService.getAllPosts(currentUserId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getPostsByUser(@PathVariable Long userId, @CurrentUserId(required = false) Long currentUserId) {
        return ResponseEntity.ok(postService.getPostsByUser(userId, currentUserId));
    }

    @PostMapping
    public ResponseEntity<?> createPost(@CurrentUserId Long currentUserId, @Valid @RequestBody PostRequestDto request) {
        try { return ResponseEntity.status(201).body(postService.createPost(currentUserId, request)); }
        catch (IllegalArgumentException ex) { return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage())); }
    }

    @PostMapping("/{postId}/like")
    public ResponseEntity<?> toggleLike(@CurrentUserId Long currentUserId, @PathVariable Long postId) {
        try { return ResponseEntity.ok(postService.toggleLike(currentUserId, postId)); }
        catch (IllegalArgumentException ex) { return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage())); }
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
