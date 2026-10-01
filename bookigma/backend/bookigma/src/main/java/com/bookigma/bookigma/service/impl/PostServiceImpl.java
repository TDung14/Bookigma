package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.CommentResponseDto;
import com.bookigma.bookigma.dto.PostRequestDto;
import com.bookigma.bookigma.dto.PostResponseDto;
import com.bookigma.bookigma.entity.Comment;
import com.bookigma.bookigma.entity.Post;
import com.bookigma.bookigma.entity.PostReaction;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.repository.CommentRepository;
import com.bookigma.bookigma.repository.PostReactionRepository;
import com.bookigma.bookigma.repository.PostRepository;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.service.PostService;
import com.bookigma.bookigma.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class PostServiceImpl implements PostService {
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final PostReactionRepository reactionRepository;
    private final CommentRepository commentRepository;
    private final NotificationService notificationService;

    public PostServiceImpl(PostRepository postRepository,
                           UserRepository userRepository,
                           PostReactionRepository reactionRepository,
                           CommentRepository commentRepository,
                           NotificationService notificationService) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.reactionRepository = reactionRepository;
        this.commentRepository = commentRepository;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponseDto> getAllPosts(Long currentUserId) {
        return postRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(post -> toDto(post, currentUserId))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponseDto> getPostsByUser(Long userId, Long currentUserId) {
        return postRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(post -> toDto(post, currentUserId))
                .toList();
    }

    @Override
    @Transactional
    public PostResponseDto createPost(Long currentUserId, PostRequestDto request) {
        User user = requireUser(currentUserId);
        if (request == null || request.getContent() == null || request.getContent().isBlank()) {
            throw new IllegalArgumentException("Nội dung bài viết không được để trống.");
        }

        Post.Visibility visibility = Post.Visibility.PUBLIC;
        if (request.getVisibility() != null && !request.getVisibility().isBlank()) {
            try {
                visibility = Post.Visibility.valueOf(request.getVisibility().trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("visibility không hợp lệ.");
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

        return toDto(postRepository.save(post), currentUserId);
    }

    @Override
    @Transactional
    public PostResponseDto toggleLike(Long currentUserId, Long postId) {
        User user = requireUser(currentUserId);
        Post post = requirePost(postId);
        reactionRepository.findByPost_IdAndUser_Id(postId, currentUserId).ifPresentOrElse(
                reactionRepository::delete,
                () -> reactionRepository.save(PostReaction.builder().post(post).user(user)
                        .reactionType(PostReaction.ReactionType.LIKE).build())
        );
        return toDto(post, currentUserId);
    }

    @Override
    @Transactional
    public CommentResponseDto addComment(Long currentUserId, Long postId, String content, Long parentCommentId) {
        User user = requireUser(currentUserId);
        Post post = requirePost(postId);
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Bình luận không được để trống.");
        }
        Comment parent = null;
        if (parentCommentId != null) {
            parent = commentRepository.findById(parentCommentId)
                    .orElseThrow(() -> new IllegalArgumentException("Bình luận cha không tồn tại."));
            if (!parent.getPost().getId().equals(postId)) {
                throw new IllegalArgumentException("Bình luận cha không thuộc bài viết này.");
            }
        }
        Comment comment = Comment.builder().post(post).user(user).parentComment(parent)
                .content(content.trim()).build();
        Comment saved = commentRepository.save(comment);

        // Người đăng bài nhận thông báo khi một user khác bình luận.
        if (!post.getUser().getId().equals(user.getId())) {
            String actor = user.getUsername();
            notificationService.createNotification(
                    post.getUser().getId(),
                    actor + " đã comment trong bài viết của bạn",
                    "/"
            );
        }

        return toCommentDto(saved);
    }

    private PostResponseDto toDto(Post post, Long currentUserId) {
        User user = post.getUser();
        List<PostReaction> reactions = reactionRepository.findByPost_IdOrderByCreatedAtAsc(post.getId());
        List<CommentResponseDto> comments = commentRepository.findByPost_IdOrderByCreatedAtAsc(post.getId()).stream()
                .map(this::toCommentDto).toList();
        boolean liked = currentUserId != null && reactions.stream().anyMatch(r -> r.getUser().getId().equals(currentUserId));
        List<Long> likedBy = reactions.stream().map(r -> r.getUser().getId()).distinct().toList();

        return PostResponseDto.builder()
                .id(post.getId())
                .userId(user.getId())
                .username(user.getUsername())
                .authorName(displayName(user))
                .avatarUrl(user.getAvatarUrl())
                .bookId(post.getBookId()).pageId(post.getPageId()).clubId(post.getClubId())
                .content(post.getContent()).imageUrl(post.getMediaUrl())
                .visibility(post.getVisibility().name()).createdAt(post.getCreatedAt())
                .likeCount(reactions.size()).likedByMe(liked).likedBy(likedBy).comments(comments)
                .build();
    }

    private CommentResponseDto toCommentDto(Comment comment) {
        User user = comment.getUser();
        return CommentResponseDto.builder()
                .id(comment.getId()).postId(comment.getPost().getId()).userId(user.getId())
                .username(user.getUsername()).authorName(displayName(user)).avatarUrl(user.getAvatarUrl())
                .content(comment.getContent())
                .parentCommentId(comment.getParentComment() == null ? null : comment.getParentComment().getId())
                .createdAt(comment.getCreatedAt()).build();
    }

    private User requireUser(Long id) {
        if (id == null) throw new IllegalArgumentException("Bạn cần đăng nhập.");
        return userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại."));
    }

    private Post requirePost(Long id) {
        if (id == null) throw new IllegalArgumentException("Bài viết không hợp lệ.");
        return postRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Bài viết không tồn tại."));
    }

    private String displayName(User user) {
        return user.getFullName() == null || user.getFullName().isBlank() ? user.getUsername() : user.getFullName();
    }

    private String blankToNull(String value) {
        if (value == null) return null;
        String result = value.trim();
        return result.isBlank() ? null : result;
    }
}
