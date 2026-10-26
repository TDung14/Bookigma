package com.bookigma.bookigma.mission.repository;

import com.bookigma.bookigma.mission.entity.DailyMission;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface DailyMissionRepository extends JpaRepository<DailyMission, Long> {

    Optional<DailyMission> findByUser_IdAndMissionDate(Long userId, LocalDate missionDate);

    /** Khóa dòng nhiệm vụ khi nhận thưởng để hai tab không thể nhận trùng. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from DailyMission m where m.user.id = :userId and m.missionDate = :date")
    Optional<DailyMission> findForUpdate(@Param("userId") Long userId, @Param("date") LocalDate date);
}
