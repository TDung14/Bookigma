package com.bookigma.bookigma.report.dto;

import com.bookigma.bookigma.report.entity.Report;

public record ResolveReportRequest(
        Report.Status status,
        String action,
        String note
) {}
