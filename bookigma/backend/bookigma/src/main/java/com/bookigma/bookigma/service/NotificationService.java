package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.NotificationResponseDto;

import java.util.List;

public interface NotificationService {
    List<NotificationResponseDto> getUserNotifications(Long userId);
    void createNotification(Long userId, String message);
    void createNotification(Long userId, String message, String link);
    void markAllAsRead(Long userId);
}
