package com.bookigma.bookigma.admin.service;

import com.bookigma.bookigma.admin.dto.AdminUserRequest;
import com.bookigma.bookigma.admin.dto.AdminUserResponse;
import com.bookigma.bookigma.admin.dto.AdminUserUpdateRequest;
import com.bookigma.bookigma.dto.CommentResponseDto;
import com.bookigma.bookigma.dto.PostResponseDto;
import com.bookigma.bookigma.report.dto.ReportResponse;
import com.bookigma.bookigma.report.dto.ResolveReportRequest;

import java.util.List;

public interface AdminService {
    List<AdminUserResponse> getUsers(Long adminId);

    AdminUserResponse createUser(Long adminId, AdminUserRequest request);

    AdminUserResponse updateUser(Long adminId, Long userId, AdminUserUpdateRequest request);

    AdminUserResponse updateUserRole(Long adminId, Long userId, String role);

    AdminUserResponse updateUserStatus(Long adminId, Long userId, boolean active);

    void deleteUser(Long adminId, Long userId);

    List<PostResponseDto> getPosts(Long adminId);

    void deletePost(Long adminId, Long postId);

    List<CommentResponseDto> getComments(Long adminId, Long postId);

    void deleteComment(Long adminId, Long commentId);

    List<ReportResponse> getReports(Long adminId);

    ReportResponse resolveReport(Long adminId, Long reportId, ResolveReportRequest request);
}
