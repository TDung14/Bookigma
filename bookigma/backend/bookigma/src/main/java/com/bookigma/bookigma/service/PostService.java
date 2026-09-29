package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.PostRequestDto;
import com.bookigma.bookigma.dto.PostResponseDto;

import java.util.List;

public interface PostService {
    List<PostResponseDto> getAllPosts();
    List<PostResponseDto> getPostsByUser(Long userId);
    PostResponseDto createPost(PostRequestDto request);
}