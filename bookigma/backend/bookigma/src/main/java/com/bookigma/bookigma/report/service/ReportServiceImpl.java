package com.bookigma.bookigma.report.service;

import com.bookigma.bookigma.entity.Comment;
import com.bookigma.bookigma.entity.Post;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.repository.CommentRepository;
import com.bookigma.bookigma.repository.PostRepository;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.report.dto.CreateReportRequest;
import com.bookigma.bookigma.report.dto.ReportResponse;
import com.bookigma.bookigma.report.dto.ResolveReportRequest;
import com.bookigma.bookigma.report.entity.Report;
import com.bookigma.bookigma.report.repository.ReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class ReportServiceImpl implements ReportService {
    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;

    public ReportServiceImpl(ReportRepository reportRepository, UserRepository userRepository,
                             PostRepository postRepository, CommentRepository commentRepository) {
        this.reportRepository = reportRepository;
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
    }

    @Override
    @Transactional
    public ReportResponse create(Long reporterId, CreateReportRequest request) {
        User reporter = requireUser(reporterId);
        if (!Boolean.TRUE.equals(reporter.getActive())) throw new IllegalArgumentException("Tài khoản đã bị khóa.");
        if (request == null || request.targetType() == null || request.targetId() == null) {
            throw new IllegalArgumentException("Đối tượng báo cáo không hợp lệ.");
        }
        String reason = normalize(request.reason());
        if (reason == null) throw new IllegalArgumentException("Vui lòng chọn lý do báo cáo.");
        validateTarget(request.targetType(), request.targetId());

        Report report = Report.builder()
                .reporter(reporter)
                .targetType(request.targetType())
                .targetId(request.targetId())
                .reason(reason)
                .detail(normalize(request.detail()))
                .status(Report.Status.PENDING)
                .build();
        return toResponse(reportRepository.save(report));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReportResponse> getMine(Long reporterId) {
        requireUser(reporterId);
        return reportRepository.findByReporter_IdOrderByCreatedAtDesc(reporterId).stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReportResponse> getAllForAdmin(Long adminId) {
        requireAdmin(adminId);
        return reportRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public ReportResponse resolve(Long adminId, Long reportId, ResolveReportRequest request) {
        User admin = requireAdmin(adminId);
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Báo cáo không tồn tại."));
        if (request == null || request.status() == null) throw new IllegalArgumentException("Trạng thái xử lý không hợp lệ.");
        if (request.status() != Report.Status.RESOLVED && request.status() != Report.Status.DISMISSED) {
            throw new IllegalArgumentException("Chỉ được xử lý hoặc từ chối báo cáo.");
        }

        String action = request.action() == null ? "NONE" : request.action().trim().toUpperCase(Locale.ROOT);
        if (request.status() == Report.Status.RESOLVED) applyAction(report, action);

        report.setStatus(request.status());
        report.setResolvedBy(admin);
        report.setResolvedAt(LocalDateTime.now());
        String note = normalize(request.note());
        if (note != null) {
            String current = report.getDetail();
            report.setDetail(current == null || current.isBlank() ? "Xử lý: " + note : current + "\nXử lý: " + note);
        }
        return toResponse(reportRepository.save(report));
    }

    private void applyAction(Report report, String action) {
        switch (action) {
            case "DELETE_POST" -> {
                if (report.getTargetType() != Report.TargetType.POST) throw new IllegalArgumentException("Action không phù hợp với đối tượng báo cáo.");
                postRepository.deleteById(report.getTargetId());
            }
            case "DELETE_COMMENT" -> {
                if (report.getTargetType() != Report.TargetType.COMMENT) throw new IllegalArgumentException("Action không phù hợp với đối tượng báo cáo.");
                commentRepository.deleteById(report.getTargetId());
            }
            case "BLOCK_USER" -> {
                if (report.getTargetType() != Report.TargetType.USER) throw new IllegalArgumentException("Action không phù hợp với đối tượng báo cáo.");
                User target = requireUser(report.getTargetId());
                target.setActive(false);
                userRepository.save(target);
            }
            case "NONE" -> { }
            default -> throw new IllegalArgumentException("Action xử lý không hợp lệ.");
        }
    }

    private void validateTarget(Report.TargetType type, Long id) {
        boolean exists = switch (type) {
            case POST -> postRepository.existsById(id);
            case COMMENT -> commentRepository.existsById(id);
            case USER -> userRepository.existsById(id);
            case CLUB -> true;
        };
        if (!exists) throw new IllegalArgumentException("Đối tượng được báo cáo không tồn tại.");
    }

    private ReportResponse toResponse(Report report) {
        User reporter = report.getReporter();
        String targetLabel = "";
        String targetContent = "";
        if (report.getTargetType() == Report.TargetType.POST) {
            Post p = postRepository.findById(report.getTargetId()).orElse(null);
            if (p != null) { targetLabel = displayName(p.getUser()); targetContent = p.getContent(); }
        } else if (report.getTargetType() == Report.TargetType.COMMENT) {
            Comment c = commentRepository.findById(report.getTargetId()).orElse(null);
            if (c != null) { targetLabel = displayName(c.getUser()); targetContent = c.getContent(); }
        } else if (report.getTargetType() == Report.TargetType.USER) {
            User u = userRepository.findById(report.getTargetId()).orElse(null);
            if (u != null) { targetLabel = displayName(u); targetContent = u.getUsername(); }
        } else {
            targetLabel = "Club #" + report.getTargetId();
        }
        User resolved = report.getResolvedBy();
        return new ReportResponse(report.getId(), reporter.getId(), reporter.getUsername(), displayName(reporter),
                report.getTargetType(), report.getTargetId(), targetLabel, targetContent, report.getReason(), report.getDetail(),
                report.getStatus(), resolved == null ? null : resolved.getId(), resolved == null ? null : displayName(resolved),
                report.getCreatedAt(), report.getResolvedAt());
    }

    private User requireAdmin(Long id) {
        User user = requireUser(id);
        if (user.getRole() != User.Role.ADMIN) throw new IllegalArgumentException("Bạn không có quyền quản trị.");
        return user;
    }

    private User requireUser(Long id) {
        if (id == null) throw new IllegalArgumentException("Bạn cần đăng nhập.");
        return userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại."));
    }

    private String displayName(User user) {
        return user.getFullName() == null || user.getFullName().isBlank() ? user.getUsername() : user.getFullName();
    }

    private String normalize(String value) {
        if (value == null) return null;
        String s = value.trim();
        return s.isBlank() ? null : s;
    }
}
