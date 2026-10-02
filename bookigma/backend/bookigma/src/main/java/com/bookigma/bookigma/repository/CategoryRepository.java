package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Integer> {
    Optional<Category> findByNameIgnoreCase(String name);

    Optional<Category> findBySlug(String slug);

    List<Category> findAllByOrderByIdAsc();
}
