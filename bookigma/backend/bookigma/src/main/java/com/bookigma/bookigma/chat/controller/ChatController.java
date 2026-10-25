package com.bookigma.bookigma.chat.controller;

import com.bookigma.bookigma.chat.dto.ChatDtos;
import com.bookigma.bookigma.chat.service.ChatService;
import com.bookigma.bookigma.config.CurrentUserId;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/conversations")
    public List<ChatDtos.ChatConversationResponse> getConversations(@CurrentUserId Long userId) {
        return chatService.getConversationsForUser(userId);
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public List<ChatDtos.ChatMessageResponse> getMessages(@PathVariable Long conversationId,
                                                         @CurrentUserId Long userId) {
        return chatService.getMessages(conversationId, userId);
    }

    @PostMapping("/conversations/direct")
    public ChatDtos.ChatConversationResponse createDirect(@CurrentUserId Long userId,
                                                          @RequestBody ChatDtos.DirectChatRequest request) {
        return chatService.createDirectConversation(userId, request.otherUserId());
    }

    @PostMapping("/conversations/group")
    public ChatDtos.ChatConversationResponse createGroup(@CurrentUserId Long userId,
                                                         @RequestBody ChatDtos.GroupChatRequest request) {
        return chatService.createGroupConversation(userId, request.participantIds(), request.name());
    }

    @PostMapping("/conversations/stranger")
    public ChatDtos.ChatConversationResponse createStranger(@CurrentUserId Long userId) {
        return chatService.createStrangerConversation(userId);
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public ChatDtos.ChatMessageResponse sendMessage(@PathVariable Long conversationId,
                                                   @CurrentUserId Long userId,
                                                   @RequestBody ChatDtos.SendChatMessageRequest request) {
        return chatService.sendMessage(conversationId, userId, request.content());
    }
}
