package com.bookigma.bookigma.chat.dto;

import com.bookigma.bookigma.chat.entity.ChatConversation;
import com.bookigma.bookigma.chat.entity.ChatMessage;

import java.time.Instant;
import java.util.List;

public final class ChatDtos {

    private ChatDtos() {
    }

    public record DirectChatRequest(Long userId, Long otherUserId) {
    }

    public record GroupChatRequest(Long creatorId, List<Long> participantIds, String name) {
    }

    public record StrangersRequest(Long userId, String name) {
    }

    public record SendChatMessageRequest(Long senderId, String content) {
    }

    public record SocketChatMessageRequest(Long conversationId, Long senderId, String content) {
    }

    public record ChatConversationResponse(Long id, String name, String type, List<Long> participantIds,
                                          Instant createdAt, Instant updatedAt, List<ChatMessageResponse> messages) {
        public static ChatConversationResponse from(ChatConversation conversation, List<ChatMessage> messages) {
            return new ChatConversationResponse(
                    conversation.getId(),
                    conversation.getName(),
                    conversation.getType().name(),
                    conversation.getParticipantIds().stream().sorted().toList(),
                    conversation.getCreatedAt(),
                    conversation.getUpdatedAt(),
                    messages.stream().map(ChatMessageResponse::from).toList()
            );
        }
    }

    public record ChatMessageResponse(Long id, Long conversationId, Long senderId, String content, String type,
                                     Instant createdAt) {
        public static ChatMessageResponse from(ChatMessage message) {
            return new ChatMessageResponse(
                    message.getId(),
                    message.getConversation().getId(),
                    message.getSenderId(),
                    message.getContent(),
                    message.getType().name(),
                    message.getCreatedAt()
            );
        }
    }
}
