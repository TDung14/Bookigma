package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.PostRequestDto;
import com.bookigma.bookigma.dto.PostResponseDto;
import com.bookigma.bookigma.entity.Post;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.repository.PostRepository;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.service.PostService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PostServiceImpl implements PostService {
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    public PostServiceImpl(PostRepository postRepository, UserRepository userRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponseDto> getAllPosts() {
        return postRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponseDto> getPostsByUser(Long userId) {
        return postRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional
    public PostResponseDto createPost(PostRequestDto request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng!"));

        Post.Visibility visibility = Post.Visibility.PUBLIC;
        if (request.getVisibility() != null && !request.getVisibility().isBlank()) {
            try {
                visibility = Post.Visibility.valueOf(request.getVisibility().trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("visibility không hợp lệ!");
            }
        }

        Post post = Post.builder()
                .user(user)
                .pageId(request.getPageId())
                .clubId(request.getClubId())
                .bookId(request.getBookId())
                .content(request.getContent().trim())
                .mediaUrl(blankToNull(request.getImageUrl()))
                .visibility(visibility)
                .build();

        return toDto(postRepository.save(post));
    }

    private PostResponseDto toDto(Post post) {
        User user = post.getUser();
        return PostResponseDto.builder()
                .id(post.getId())
                .userId(user.getId())
                .username(user.getUsername())
                .authorName(user.getFullName() == null || user.getFullName().isBlank()
                        ? user.getUsername() : user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .bookId(post.getBookId())
                .pageId(post.getPageId())
                .clubId(post.getClubId())
                .content(post.getContent())
                .imageUrl(post.getMediaUrl())
                .visibility(post.getVisibility().name())
                .createdAt(post.getCreatedAt())
                .build();
    }

    private String blankToNull(String value) {
        if (value == null) return null;
        String result = value.trim();
        return result.isBlank() ? null : result;
    }
}