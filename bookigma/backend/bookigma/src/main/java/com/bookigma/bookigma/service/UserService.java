package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.AuthRequest;
import com.bookigma.bookigma.dto.ChangePasswordRequest;
import com.bookigma.bookigma.dto.RegisterResponse;
import com.bookigma.bookigma.dto.UserProfileDto;

import java.util.List;

public interface UserService {
    RegisterResponse register(AuthRequest request);
    UserProfileDto login(AuthRequest request);
    UserProfileDto loginWithGoogle(String credential);
    UserProfileDto verifyEmail(String token);
    void resendVerificationEmail(String email);
    List<UserProfileDto> getAllUsers();
    UserProfileDto getUserProfile(Long userId);
    UserProfileDto updateUserProfile(Long userId, UserProfileDto dto);
    UserProfileDto updateUserAvatar(Long userId, String avatarUrl);
    UserProfileDto updateUserBanner(Long userId, String bannerUrl);

    void forgotPassword(String email);
    void changePassword(Long userId, ChangePasswordRequest request);
}
