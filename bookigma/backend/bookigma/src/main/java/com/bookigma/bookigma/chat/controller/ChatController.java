package com.bookigma.bookigma.chat.controller;

import com.bookigma.bookigma.chat.dto.ChatDtos;
import com.bookigma.bookigma.chat.service.ChatService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/conversations")
    public List<ChatDtos.ChatConversationResponse> getConversations(@RequestParam Long userId) {
        return chatService.getConversationsForUser(userId);
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public List<ChatDtos.ChatMessageResponse> getMessages(@PathVariable Long conversationId) {
        return chatService.getMessages(conversationId);
    }

    @PostMapping("/conversations/direct")
    public ChatDtos.ChatConversationResponse createDirect(@RequestBody ChatDtos.DirectChatRequest request) {
        try {
            return chatService.createDirectConversation(request.userId(), request.otherUserId());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @PostMapping("/conversations/group")
    public ChatDtos.ChatConversationResponse createGroup(@RequestBody ChatDtos.GroupChatRequest request) {
        try {
            return chatService.createGroupConversation(request.creatorId(), request.participantIds(), request.name());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @PostMapping("/conversations/stranger")
    public ChatDtos.ChatConversationResponse createStranger(@RequestBody ChatDtos.StrangersRequest request) {
        try {
            return chatService.createStrangerConversation(request.userId());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public ChatDtos.ChatMessageResponse sendMessage(@PathVariable Long conversationId,
                                                   @RequestBody ChatDtos.SendChatMessageRequest request) {
        try {
            return chatService.sendMessage(conversationId, request.senderId(), request.content());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }
}
