package com.bookigma.bookigma.service;

import com.bookigma.bookigma.entity.Notification;
import java.util.List;

public interface NotificationService {
    List<Notification> getUserNotifications(Long userId);
    void createNotification(Long userId, String message);
}