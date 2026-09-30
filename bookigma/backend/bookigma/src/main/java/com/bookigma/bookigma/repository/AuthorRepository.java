package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.Author;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AuthorRepository extends JpaRepository<Author, Integer> {
    Optional<Author> findFirstByNameIgnoreCase(String name);
}
