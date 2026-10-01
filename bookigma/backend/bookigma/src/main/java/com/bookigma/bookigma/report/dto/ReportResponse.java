package com.bookigma.bookigma.report.dto;

import com.bookigma.bookigma.report.entity.Report;

import java.time.LocalDateTime;

public record ReportResponse(
        Long id,
        Long reporterId,
        String reporterUsername,
        String reporterName,
        Report.TargetType targetType,
        Long targetId,
        String targetLabel,
        String targetContent,
        String reason,
        String detail,
        Report.Status status,
        Long resolvedBy,
        String resolvedByName,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt
) {}
