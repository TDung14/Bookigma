package com.bookigma.bookigma.report.service;

import com.bookigma.bookigma.report.dto.CreateReportRequest;
import com.bookigma.bookigma.report.dto.ReportResponse;
import com.bookigma.bookigma.report.dto.ResolveReportRequest;

import java.util.List;

public interface ReportService {
    ReportResponse create(Long reporterId, CreateReportRequest request);
    List<ReportResponse> getMine(Long reporterId);
    List<ReportResponse> getAllForAdmin(Long adminId);
    ReportResponse resolve(Long adminId, Long reportId, ResolveReportRequest request);
}
