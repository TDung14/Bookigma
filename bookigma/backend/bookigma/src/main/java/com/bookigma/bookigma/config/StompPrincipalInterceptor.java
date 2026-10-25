package com.bookigma.bookigma.config;

import com.bookigma.bookigma.chat.repository.ChatConversationRepository;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.security.AuthPrincipal;
import com.bookigma.bookigma.security.JwtService;
import io.jsonwebtoken.JwtException;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;

/**
 * Xác thực STOMP bằng JWT khi CONNECT và chặn subscribe vào cuộc trò chuyện
 * mà người dùng không phải thành viên. Không tin userId/X-User-Id do client gửi.
 */
@Component
public class StompPrincipalInterceptor implements ChannelInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String CHAT_TOPIC_PREFIX = "/topic/chat/";

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final ChatConversationRepository conversationRepository;

    public StompPrincipalInterceptor(JwtService jwtService,
                                     UserRepository userRepository,
                                     ChatConversationRepository conversationRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticate(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            authorizeSubscription(accessor);
        }

        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String token = resolveBearerToken(accessor);
        if (token == null) {
            throw new MessageDeliveryException("Thiếu token đăng nhập cho kết nối chat.");
        }

        try {
            AuthPrincipal claims = jwtService.parseToken(token);
            User user = userRepository.findById(claims.userId()).orElse(null);
            if (user == null || !Boolean.TRUE.equals(user.getActive())) {
                throw new MessageDeliveryException("Tài khoản không hợp lệ hoặc đã bị khóa.");
            }
            accessor.setUser(() -> String.valueOf(user.getId()));
        } catch (JwtException | IllegalArgumentException ex) {
            throw new MessageDeliveryException("Token đăng nhập không hợp lệ hoặc đã hết hạn.");
        }
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith(CHAT_TOPIC_PREFIX)) {
            return;
        }

        Long userId = principalUserId(accessor.getUser());
        if (userId == null) {
            throw new MessageDeliveryException("Bạn cần đăng nhập để theo dõi cuộc trò chuyện.");
        }

        Long conversationId;
        try {
            conversationId = Long.valueOf(destination.substring(CHAT_TOPIC_PREFIX.length()));
        } catch (NumberFormatException ex) {
            throw new MessageDeliveryException("Kênh trò chuyện không hợp lệ.");
        }

        if (conversationRepository.countParticipant(conversationId, userId) == 0) {
            throw new MessageDeliveryException("Bạn không thuộc cuộc trò chuyện này.");
        }
    }

    private String resolveBearerToken(StompHeaderAccessor accessor) {
        String header = firstNonBlank(
                accessor.getFirstNativeHeader("Authorization"),
                accessor.getFirstNativeHeader("authorization"));
        if (header == null || !header.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            return null;
        }
        String token = header.substring(BEARER_PREFIX.length()).trim();
        return token.isEmpty() ? null : token;
    }

    private Long principalUserId(Principal principal) {
        if (principal == null) {
            return null;
        }
        try {
            return Long.valueOf(principal.getName());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
