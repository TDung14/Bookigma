package com.bookigma.bookigma.chat.controller;

import com.bookigma.bookigma.chat.dto.ChatDtos;
import com.bookigma.bookigma.chat.service.ChatService;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatSocketController {

    private final ChatService chatService;

    public ChatSocketController(ChatService chatService) {
        this.chatService = chatService;
    }

    @MessageMapping("/chat.sendMessage")
    public ChatDtos.ChatMessageResponse sendMessage(ChatDtos.SocketChatMessageRequest request, Principal principal) {
        if (principal == null) {
            throw new MessageDeliveryException("Bạn cần đăng nhập để gửi tin nhắn.");
        }
        Long senderId;
        try {
            senderId = Long.valueOf(principal.getName());
        } catch (NumberFormatException ex) {
            throw new MessageDeliveryException("Phiên trò chuyện không hợp lệ, vui lòng kết nối lại.");
        }
        return chatService.sendMessage(request.conversationId(), senderId, request.content());
    }
}
