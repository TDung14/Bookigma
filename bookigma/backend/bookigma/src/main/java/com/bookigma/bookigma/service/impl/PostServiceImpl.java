package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.club.entity.BookClub;
import com.bookigma.bookigma.club.service.ClubAccessService;
import com.bookigma.bookigma.dto.CommentResponseDto;
import com.bookigma.bookigma.dto.PostRequestDto;
import com.bookigma.bookigma.dto.PostResponseDto;
import com.bookigma.bookigma.entity.Comment;
import com.bookigma.bookigma.entity.CommentReaction;
import com.bookigma.bookigma.entity.Post;
import com.bookigma.bookigma.entity.PostReaction;
import com.bookigma.bookigma.entity.ReactionType;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.repository.CommentReactionRepository;
import com.bookigma.bookigma.repository.CommentRepository;
import com.bookigma.bookigma.repository.PostReactionRepository;
import com.bookigma.bookigma.repository.PostRepository;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.mission.service.MissionService;
import com.bookigma.bookigma.service.PostService;
import com.bookigma.bookigma.service.NotificationService;
import com.bookigma.bookigma.service.PointService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PostServiceImpl implements PostService {
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final PostReactionRepository reactionRepository;
    private final CommentReactionRepository commentReactionRepository;
    private final CommentRepository commentRepository;
    private final NotificationService notificationService;
    private final PointService pointService;
    private final MissionService missionService;
    private final ClubAccessService clubAccess;

    public PostServiceImpl(PostRepository postRepository,
                           UserRepository userRepository,
                           PostReactionRepository reactionRepository,
                           CommentReactionRepository commentReactionRepository,
                           CommentRepository commentRepository,
                           NotificationService notificationService,
                           PointService pointService,
                           MissionService missionService,
                           ClubAccessService clubAccess) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.reactionRepository = reactionRepository;
        this.commentReactionRepository = commentReactionRepository;
        this.commentRepository = commentRepository;
        this.notificationService = notificationService;
        this.pointService = pointService;
        this.missionService = missionService;
        this.clubAccess = clubAccess;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponseDto> getAllPosts(Long currentUserId) {
        return postRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(post -> post.getClubId() == null)
                .map(post -> toDto(post, currentUserId))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponseDto> getPostsByUser(Long userId, Long currentUserId) {
        return postRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                // Bài trong nhóm chỉ hiển thị ở không gian của nhóm, không lộ ra trang cá nhân.
                .filter(post -> post.getClubId() == null)
                .map(post -> toDto(post, currentUserId))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponseDto> getClubPosts(Long currentUserId, Long clubId) {
        BookClub club = clubAccess.requireClub(clubId);
        if (Boolean.TRUE.equals(club.getPrivateClub()) && !clubAccess.isMember(clubId, currentUserId)) {
            throw ApiException.forbidden("Nhóm này ở chế độ riêng tư. Hãy tham gia để xem thảo luận.");
        }
        return postRepository.findByClubIdOrderByCreatedAtDesc(clubId).stream()
                .map(post -> toDto(post, currentUserId))
                .toList();
    }

    @Override
    @Transactional
    public PostResponseDto createPost(Long currentUserId, PostRequestDto request) {
        if (request != null && request.getClubId() != null) {
            return createClubPost(currentUserId, request.getClubId(), request);
        }
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

        Post savedPost = postRepository.save(post);
        // Cộng điểm ở backend để Ví Điểm Bookigma được lưu trong database,
        // không phụ thuộc localStorage/frontend.
        pointService.addRewardPoints(currentUserId, 10, "CREATE_POST",
                "POST:" + savedPost.getId(), "Đăng bài viết");
        missionService.recordSocial(currentUserId);
        return toDto(savedPost, currentUserId);
    }

    @Override
    @Transactional
    public PostResponseDto createClubPost(Long currentUserId, Long clubId, PostRequestDto request) {
        User user = clubAccess.requireUser(currentUserId);
        BookClub club = clubAccess.requireClub(clubId);
        clubAccess.requireMember(clubId, currentUserId);
        if (request == null || request.getContent() == null || request.getContent().isBlank()) {
            throw new IllegalArgumentException("Nội dung bài viết không được để trống.");
        }

        Post post = Post.builder()
                .user(user)
                .clubId(club.getId())
                .bookId(request.getBookId())
                .content(request.getContent().trim())
                .mediaUrl(blankToNull(request.getImageUrl()))
                .visibility(Post.Visibility.CLUB_ONLY)
                .build();

        Post savedPost = postRepository.save(post);
        pointService.addRewardPoints(currentUserId, 10, "CREATE_POST",
                "POST:" + savedPost.getId(), "Đăng bài trong nhóm đọc sách");
        missionService.recordSocial(currentUserId);
        return toDto(savedPost, currentUserId);
    }

    @Override
    @Transactional
    public PostResponseDto reactToPost(Long currentUserId, Long postId, String reactionType) {
        User user = requireUser(currentUserId);
        Post post = requirePost(postId);
        requireClubInteraction(post.getClubId(), currentUserId);
        ReactionType type = parseReaction(reactionType);
        reactionRepository.findByPost_IdAndUser_Id(postId, currentUserId).ifPresentOrElse(
                existing -> {
                    if (existing.getReactionType() == type) {
                        reactionRepository.delete(existing);
                    } else {
                        existing.setReactionType(type);
                    }
                },
                () -> reactionRepository.save(PostReaction.builder().post(post).user(user).reactionType(type).build())
        );
        return toDto(post, currentUserId);
    }

    @Override
    @Transactional
    public CommentResponseDto reactToComment(Long currentUserId, Long commentId, String reactionType) {
        User user = requireUser(currentUserId);
        Comment comment = requireComment(commentId);
        requireClubInteraction(comment.getPost().getClubId(), currentUserId);
        ReactionType type = parseReaction(reactionType);
        commentReactionRepository.findByComment_IdAndUser_Id(commentId, currentUserId).ifPresentOrElse(
                existing -> {
                    if (existing.getReactionType() == type) {
                        commentReactionRepository.delete(existing);
                    } else {
                        existing.setReactionType(type);
                    }
                },
                () -> commentReactionRepository.save(
                        CommentReaction.builder().comment(comment).user(user).reactionType(type).build())
        );
        return toCommentDto(comment, commentReactionRepository.findByComment_IdOrderByCreatedAtAsc(commentId), currentUserId);
    }

    @Override
    @Transactional
    public CommentResponseDto addComment(Long currentUserId, Long postId, String content, Long parentCommentId) {
        User user = requireUser(currentUserId);
        Post post = requirePost(postId);
        requireClubInteraction(post.getClubId(), currentUserId);
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
        // Thưởng điểm bình luận trực tiếp trên backend.
        pointService.addRewardPoints(currentUserId, 10, "CREATE_COMMENT",
                "COMMENT:" + saved.getId(), "Viết bình luận");
        missionService.recordSocial(currentUserId);

        // Người đăng bài nhận thông báo khi một user khác bình luận.
        if (!post.getUser().getId().equals(user.getId())) {
            String actor = user.getUsername();
            notificationService.createNotification(
                    post.getUser().getId(),
                    actor + " đã comment trong bài viết của bạn",
                    post.getClubId() == null ? "/" : "/clubs/" + post.getClubId()
            );
        }

        return toCommentDto(saved, List.of(), currentUserId);
    }

    private PostResponseDto toDto(Post post, Long currentUserId) {
        User user = post.getUser();
        List<PostReaction> reactions = reactionRepository.findByPost_IdOrderByCreatedAtAsc(post.getId());

        Map<Long, List<CommentReaction>> commentReactions = commentReactionRepository
                .findByComment_Post_IdOrderByCreatedAtAsc(post.getId()).stream()
                .collect(Collectors.groupingBy(
                        reaction -> reaction.getComment().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()));
        List<CommentResponseDto> comments = commentRepository.findByPost_IdOrderByCreatedAtAsc(post.getId()).stream()
                .map(comment -> toCommentDto(
                        comment,
                        commentReactions.getOrDefault(comment.getId(), List.of()),
                        currentUserId))
                .toList();

        String myReaction = currentUserId == null ? null : reactions.stream()
                .filter(reaction -> reaction.getUser().getId().equals(currentUserId))
                .map(reaction -> reaction.getReactionType().name())
                .findFirst().orElse(null);
        List<Long> likedBy = reactions.stream().map(reaction -> reaction.getUser().getId()).distinct().toList();

        return PostResponseDto.builder()
                .id(post.getId())
                .userId(user.getId())
                .username(user.getUsername())
                .authorName(displayName(user))
                .avatarUrl(user.getAvatarUrl())
                .bookId(post.getBookId()).pageId(post.getPageId()).clubId(post.getClubId())
                .content(post.getContent()).imageUrl(post.getMediaUrl())
                .visibility(post.getVisibility().name()).createdAt(post.getCreatedAt())
                .likeCount(reactions.size()).likedByMe(myReaction != null).likedBy(likedBy)
                .reactionCounts(reactionCounts(reactions.stream().map(PostReaction::getReactionType).toList()))
                .myReaction(myReaction)
                .comments(comments)
                .build();
    }

    private CommentResponseDto toCommentDto(Comment comment, List<CommentReaction> reactions, Long currentUserId) {
        User user = comment.getUser();
        String myReaction = currentUserId == null ? null : reactions.stream()
                .filter(reaction -> reaction.getUser().getId().equals(currentUserId))
                .map(reaction -> reaction.getReactionType().name())
                .findFirst().orElse(null);
        return CommentResponseDto.builder()
                .id(comment.getId()).postId(comment.getPost().getId()).userId(user.getId())
                .username(user.getUsername()).authorName(displayName(user)).avatarUrl(user.getAvatarUrl())
                .content(comment.getContent())
                .parentCommentId(comment.getParentComment() == null ? null : comment.getParentComment().getId())
                .createdAt(comment.getCreatedAt())
                .reactionCount(reactions.size())
                .reactionCounts(reactionCounts(reactions.stream().map(CommentReaction::getReactionType).toList()))
                .myReaction(myReaction)
                .build();
    }

    private Map<String, Long> reactionCounts(List<ReactionType> reactions) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (ReactionType type : ReactionType.values()) {
            long count = reactions.stream().filter(reaction -> reaction == type).count();
            if (count > 0) counts.put(type.name(), count);
        }
        return counts;
    }

    private ReactionType parseReaction(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Vui lòng chọn cảm xúc.");
        }
        try {
            return ReactionType.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Cảm xúc không hợp lệ.");
        }
    }

    /** Bài viết trong nhóm chỉ cho thành viên tương tác, kể cả nhóm công khai. */
    private void requireClubInteraction(Long clubId, Long userId) {
        if (clubId == null) return;
        clubAccess.requireMember(clubId, userId);
    }

    private User requireUser(Long id) {
        if (id == null) throw new IllegalArgumentException("Bạn cần đăng nhập.");
        return userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại."));
    }

    private Post requirePost(Long id) {
        if (id == null) throw new IllegalArgumentException("Bài viết không hợp lệ.");
        return postRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Bài viết không tồn tại."));
    }

    private Comment requireComment(Long id) {
        if (id == null) throw new IllegalArgumentException("Bình luận không hợp lệ.");
        return commentRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Bình luận không tồn tại."));
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
