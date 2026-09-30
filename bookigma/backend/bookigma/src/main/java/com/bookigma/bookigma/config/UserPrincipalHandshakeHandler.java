package com.bookigma.bookigma.config;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

public class UserPrincipalHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(ServerHttpRequest request,
                                     WebSocketHandler wsHandler,
                                     Map<String, Object> attributes) {
        String userId = null;

        if (request.getURI() != null) {
            userId = UriComponentsBuilder.fromUri(request.getURI())
                    .build()
                    .getQueryParams()
                    .getFirst("userId");
        }

        if (userId == null || userId.isBlank()) {
            userId = request.getHeaders().getFirst("X-User-Id");
        }

        final String resolvedUserId = (userId == null || userId.isBlank()) ? UUID.randomUUID().toString() : userId;
        return () -> resolvedUserId;
    }
}
