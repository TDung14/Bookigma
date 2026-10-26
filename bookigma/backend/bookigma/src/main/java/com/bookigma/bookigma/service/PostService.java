package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.CommentResponseDto;
import com.bookigma.bookigma.dto.PostRequestDto;
import com.bookigma.bookigma.dto.PostResponseDto;

import java.util.List;

public interface PostService {
    List<PostResponseDto> getAllPosts(Long currentUserId);
    List<PostResponseDto> getPostsByUser(Long userId, Long currentUserId);
    List<PostResponseDto> getClubPosts(Long currentUserId, Long clubId);
    PostResponseDto createPost(Long currentUserId, PostRequestDto request);
    PostResponseDto createClubPost(Long currentUserId, Long clubId, PostRequestDto request);
    PostResponseDto reactToPost(Long currentUserId, Long postId, String reactionType);
    CommentResponseDto addComment(Long currentUserId, Long postId, String content, Long parentCommentId);
    CommentResponseDto reactToComment(Long currentUserId, Long commentId, String reactionType);
}
