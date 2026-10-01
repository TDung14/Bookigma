package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.AuthRequest;
import com.bookigma.bookigma.dto.ChangePasswordRequest;
import com.bookigma.bookigma.dto.UserProfileDto;

import java.util.List;

public interface UserService {
    UserProfileDto register(AuthRequest request);
    UserProfileDto login(AuthRequest request);
    List<UserProfileDto> getAllUsers();
    UserProfileDto getUserProfile(Long userId);
    UserProfileDto updateUserProfile(Long userId, UserProfileDto dto);

    void forgotPassword(String email);
    void changePassword(Long userId, ChangePasswordRequest request);
}
