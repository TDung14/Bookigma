package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.AuthRequest;
import com.bookigma.bookigma.dto.UserProfileDto;

public interface UserService {
    UserProfileDto register(AuthRequest request);
    UserProfileDto login(AuthRequest request);
    UserProfileDto getUserProfile(Long userId);
    UserProfileDto updateUserProfile(Long userId, UserProfileDto dto);
}