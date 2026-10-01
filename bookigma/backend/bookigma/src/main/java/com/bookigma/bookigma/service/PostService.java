package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.CommentResponseDto;
import com.bookigma.bookigma.dto.PostRequestDto;
import com.bookigma.bookigma.dto.PostResponseDto;

import java.util.List;

public interface PostService {
    List<PostResponseDto> getAllPosts(Long currentUserId);
    List<PostResponseDto> getPostsByUser(Long userId, Long currentUserId);
    PostResponseDto createPost(Long currentUserId, PostRequestDto request);
    PostResponseDto toggleLike(Long currentUserId, Long postId);
    CommentResponseDto addComment(Long currentUserId, Long postId, String content, Long parentCommentId);
}
