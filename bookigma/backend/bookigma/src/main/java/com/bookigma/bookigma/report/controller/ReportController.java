package com.bookigma.bookigma.report.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.report.dto.CreateReportRequest;
import com.bookigma.bookigma.report.dto.ResolveReportRequest;
import com.bookigma.bookigma.report.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportController {
    private final ReportService reportService;

    public ReportController(ReportService reportService) { this.reportService = reportService; }

    @PostMapping
    public ResponseEntity<?> create(@CurrentUserId Long userId, @RequestBody CreateReportRequest request) {
        try { return ResponseEntity.status(201).body(reportService.create(userId, request)); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
    }

    @GetMapping("/mine")
    public ResponseEntity<?> mine(@CurrentUserId Long userId) {
        try { return ResponseEntity.ok(reportService.getMine(userId)); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
    }
}
