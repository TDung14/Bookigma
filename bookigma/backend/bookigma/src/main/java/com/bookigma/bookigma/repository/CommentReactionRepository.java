package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.CommentReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CommentReactionRepository extends JpaRepository<CommentReaction, Long> {
    List<CommentReaction> findByComment_Post_IdOrderByCreatedAtAsc(Long postId);
    List<CommentReaction> findByComment_IdOrderByCreatedAtAsc(Long commentId);
    Optional<CommentReaction> findByComment_IdAndUser_Id(Long commentId, Long userId);
    long countByComment_Id(Long commentId);
}
