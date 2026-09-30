package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.NotificationResponseDto;
import com.bookigma.bookigma.entity.Notification;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.repository.NotificationRepository;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.service.InputUtils;
import com.bookigma.bookigma.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationServiceImpl implements NotificationService {
    // Cột message và link trong bảng notifications là VARCHAR(255)
    private static final int MAX_LENGTH = 255;

    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponseDto> getUserNotifications(Long userId) {
        return notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public void createNotification(Long userId, String message) {
        createNotification(userId, message, null);
    }

    @Override
    public void createNotification(Long userId, String message, String link) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Notification notification = Notification.builder()
                .user(user)
                .message(InputUtils.truncate(message, MAX_LENGTH))
                .link(InputUtils.truncate(link, MAX_LENGTH))
                .build();
        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
    }

    private NotificationResponseDto toDto(Notification notification) {
        return NotificationResponseDto.builder()
                .id(notification.getId())
                .userId(notification.getUser().getId())
                .message(notification.getMessage())
                .link(notification.getLink())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
