package com.bookigma.bookigma.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompPrincipalInterceptor stompPrincipalInterceptor;

    public WebSocketConfig(StompPrincipalInterceptor stompPrincipalInterceptor) {
        this.stompPrincipalInterceptor = stompPrincipalInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompPrincipalInterceptor);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        final String[] allowedOrigins = {
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "https://*.vercel.app"
        };

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins)
                .setHandshakeHandler(new UserPrincipalHandshakeHandler())
                .withSockJS();

        registry.addEndpoint("/ws-native")
                .setAllowedOriginPatterns(allowedOrigins)
                .setHandshakeHandler(new UserPrincipalHandshakeHandler());
    }
}
