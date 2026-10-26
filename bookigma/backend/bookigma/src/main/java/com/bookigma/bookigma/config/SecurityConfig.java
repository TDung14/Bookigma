package com.bookigma.bookigma.config;

import com.bookigma.bookigma.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint((request, response, ex) -> writeError(
                                response, HttpServletResponse.SC_UNAUTHORIZED,
                                "Bạn cần đăng nhập để thực hiện thao tác này."))
                        .accessDeniedHandler((request, response, ex) -> writeError(
                                response, HttpServletResponse.SC_FORBIDDEN,
                                "Bạn không có quyền truy cập khu vực này.")))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers("/api/auth/**", "/actuator/health", "/ws/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/vip/plans").permitAll()
                        .requestMatchers("/api/vip/webhook/**").permitAll()
                        .requestMatchers("/api/chat/**", "/api/notifications/**", "/api/users/**").authenticated()
                        .requestMatchers("/api/cart/**", "/api/orders/**", "/api/points/**", "/api/vip/**").authenticated()
                        .requestMatchers("/api/progress/**", "/api/missions/**", "/api/rewards/**").authenticated()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/seller/**").hasAnyRole("SHOP", "MODERATOR")
                        // Các API công khai (feed, sách, shop...) vẫn mở; endpoint cần danh tính
                        // sẽ tự chặn qua @CurrentUserId hoặc kiểm tra chủ sở hữu.
                        .requestMatchers("/api/**").permitAll()
                        .anyRequest().permitAll())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private void writeError(HttpServletResponse response,
                            int status,
                            String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        String escaped = message.replace("\\", "\\\\").replace("\"", "\\\"");
        response.getWriter().write("{\"message\":\"" + escaped + "\"}");
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
