package com.bookigma.bookigma.chat.service;

import com.bookigma.bookigma.chat.dto.ChatDtos;
import com.bookigma.bookigma.chat.entity.ChatConversation;
import com.bookigma.bookigma.chat.entity.ChatMessage;
import com.bookigma.bookigma.chat.entity.ChatType;
import com.bookigma.bookigma.chat.entity.MessageType;
import com.bookigma.bookigma.chat.repository.ChatConversationRepository;
import com.bookigma.bookigma.chat.repository.ChatMessageRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class ChatService {

    private final ChatConversationRepository conversationRepository;
    private final ChatMessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatService(ChatConversationRepository conversationRepository,
                       ChatMessageRepository messageRepository,
                       SimpMessagingTemplate messagingTemplate) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional(readOnly = true)
    public List<ChatDtos.ChatConversationResponse> getConversationsForUser(Long userId) {
        return conversationRepository.findByParticipantId(userId).stream()
                .sorted(Comparator.comparing(ChatConversation::getUpdatedAt).reversed())
                .map(this::toConversationResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChatDtos.ChatMessageResponse> getMessages(Long conversationId) {
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId).stream()
                .map(ChatDtos.ChatMessageResponse::from)
                .toList();
    }

    @Transactional
    public ChatDtos.ChatConversationResponse createDirectConversation(Long userId, Long otherUserId) {
        if (Objects.equals(userId, otherUserId)) {
            throw new IllegalArgumentException("Direct chat cannot be created with the same user.");
        }

        Optional<ChatConversation> existing = conversationRepository.findDirectConversation(ChatType.DIRECT, userId, otherUserId);
        if (existing.isPresent()) {
            return toConversationResponse(existing.get());
        }

        ChatConversation conversation = new ChatConversation();
        conversation.setType(ChatType.DIRECT);
        conversation.setCreatedBy(userId);
        conversation.setName("Direct chat");
        conversation.addParticipant(userId);
        conversation.addParticipant(otherUserId);
        conversationRepository.save(conversation);

        return toConversationResponse(conversation);
    }

    @Transactional
    public ChatDtos.ChatConversationResponse createGroupConversation(Long creatorId, List<Long> participantIds, String name) {
        if (creatorId == null) {
            throw new IllegalArgumentException("Creator is required.");
        }

        if (participantIds == null || participantIds.size() < 2) {
            throw new IllegalArgumentException("Group chat must have at least 3 people including the creator.");
        }

        HashSet<Long> ids = new HashSet<>(participantIds);
        ids.add(creatorId);
        if (ids.size() < 3) {
            throw new IllegalArgumentException("Group chat must have at least 3 people including the creator.");
        }

        ChatConversation conversation = new ChatConversation();
        conversation.setType(ChatType.GROUP);
        conversation.setCreatedBy(creatorId);
        conversation.setName(name == null || name.isBlank() ? "Nhóm chat" : name.trim());
        ids.forEach(conversation::addParticipant);
        conversationRepository.save(conversation);

        return toConversationResponse(conversation);
    }

    @Transactional
    public ChatDtos.ChatConversationResponse createStrangerConversation(Long userId) {
        Optional<ChatConversation> existing = conversationRepository.findByTypeAndName(ChatType.STRANGER, "Stranger chat");
        ChatConversation conversation = existing.orElseGet(() -> {
            ChatConversation c = new ChatConversation();
            c.setType(ChatType.STRANGER);
            c.setCreatedBy(userId);
            c.setName("Stranger chat");
            c.addParticipant(userId);
            c.addParticipant(-1L);
            return c;
        });

        if (!conversation.getParticipantIds().contains(userId)) {
            conversation.addParticipant(userId);
        }

        conversationRepository.save(conversation);
        return toConversationResponse(conversation);
    }

    @Transactional
    public ChatDtos.ChatMessageResponse sendMessage(Long conversationId, Long senderId, String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Message content is required.");
        }

        ChatConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        if (!conversation.getParticipantIds().contains(senderId)) {
            throw new IllegalArgumentException("Sender is not a participant in this conversation.");
        }

        ChatMessage message = new ChatMessage();
        message.setConversation(conversation);
        message.setSenderId(senderId);
        message.setContent(content.trim());
        message.setType(MessageType.TEXT);
        messageRepository.save(message);

        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);

        ChatDtos.ChatMessageResponse response = ChatDtos.ChatMessageResponse.from(message);
        messagingTemplate.convertAndSend("/topic/chat/" + conversationId, response);

        for (Long participantId : conversation.getParticipantIds()) {
            messagingTemplate.convertAndSendToUser(String.valueOf(participantId), "/queue/messages", response);
        }

        return response;
    }

    private ChatDtos.ChatConversationResponse toConversationResponse(ChatConversation conversation) {
        List<ChatMessage> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId());
        return ChatDtos.ChatConversationResponse.from(conversation, messages);
    }
}
