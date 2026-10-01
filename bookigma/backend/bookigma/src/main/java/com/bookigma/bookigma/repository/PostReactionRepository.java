package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.PostReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostReactionRepository extends JpaRepository<PostReaction, Long> {
    List<PostReaction> findByPost_IdOrderByCreatedAtAsc(Long postId);
    Optional<PostReaction> findByPost_IdAndUser_Id(Long postId, Long userId);
    long countByPost_Id(Long postId);
}
