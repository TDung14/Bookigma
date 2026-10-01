package com.bookigma.bookigma.report.repository;

import com.bookigma.bookigma.report.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findAllByOrderByCreatedAtDesc();
    List<Report> findByReporter_IdOrderByCreatedAtDesc(Long reporterId);
}
