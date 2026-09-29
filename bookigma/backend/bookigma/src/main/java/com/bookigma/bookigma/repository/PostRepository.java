package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findAllByOrderByCreatedAtDesc();
    List<Post> findByUser_IdOrderByCreatedAtDesc(Long userId);
}