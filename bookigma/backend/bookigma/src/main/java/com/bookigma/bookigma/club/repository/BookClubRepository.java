package com.bookigma.bookigma.club.repository;

import com.bookigma.bookigma.club.entity.BookClub;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookClubRepository extends JpaRepository<BookClub, Long> {
    List<BookClub> findAllByOrderByCreatedAtDesc();

    List<BookClub> findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCaseOrderByCreatedAtDesc(
            String name, String description);

    boolean existsByNameIgnoreCase(String name);

    java.util.Optional<BookClub> findFirstByNameIgnoreCase(String name);
}
