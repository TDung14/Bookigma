package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.BlindBox;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BlindBoxRepository extends JpaRepository<BlindBox, Long> {
    Optional<BlindBox> findByIdAndUserId(Long id, Long userId);

    List<BlindBox> findByUserIdAndStatusIn(Long userId, Collection<BlindBox.Status> statuses);

    List<BlindBox> findByBook_IdAndStatus(Long bookId, BlindBox.Status status);

    /** Dọn các hộp nháp người dùng đã bỏ dở (chưa cho vào giỏ), trừ hộp đang được chọn. */
    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM BlindBox b WHERE b.userId = :userId AND b.status = :status AND b.id <> :keepId "
            + "AND NOT EXISTS (SELECT 1 FROM CartItem c WHERE c.blindBox.id = b.id)")
    int deleteDraftsNotInCart(@Param("userId") Long userId,
                              @Param("status") BlindBox.Status status,
                              @Param("keepId") Long keepId);
}
