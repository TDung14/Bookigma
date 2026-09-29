package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.entity.Notification;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.repository.NotificationRepository;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class NotificationServiceImpl implements NotificationService {
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private UserRepository userRepository;

    @Override
    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public void createNotification(Long userId, String message) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Notification notification = Notification.builder().user(user).message(message).build();
        notificationRepository.save(notification);
    }
}