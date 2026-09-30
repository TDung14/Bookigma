package com.bookigma.bookigma.chat.controller;

import com.bookigma.bookigma.chat.dto.ChatDtos;
import com.bookigma.bookigma.chat.service.ChatService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

@Controller
public class ChatSocketController {

    private final ChatService chatService;

    public ChatSocketController(ChatService chatService) {
        this.chatService = chatService;
    }

    @MessageMapping("/chat.sendMessage")
    public ChatDtos.ChatMessageResponse sendMessage(ChatDtos.SocketChatMessageRequest request) {
        return chatService.sendMessage(request.conversationId(), request.senderId(), request.content());
    }
}
