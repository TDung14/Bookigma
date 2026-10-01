package com.bookigma.bookigma.report.dto;

import com.bookigma.bookigma.report.entity.Report;

public record CreateReportRequest(
        Report.TargetType targetType,
        Long targetId,
        String reason,
        String detail
) {}
