package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByPost_IdOrderByCreatedAtAsc(Long postId);
    long countByPost_Id(Long postId);
}
