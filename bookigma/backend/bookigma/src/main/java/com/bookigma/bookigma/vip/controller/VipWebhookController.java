package com.bookigma.bookigma.vip.controller;

import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.vip.dto.VipDtos.BankTransferResult;
import com.bookigma.bookigma.vip.service.VipService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.Map;

/**
 * Cổng nhận xác nhận chuyển khoản từ dịch vụ ngân hàng (SePay, Casso, ...).
 * Bí mật được cấu hình bằng biến môi trường VIP_WEBHOOK_SECRET, không lưu trong mã nguồn.
 */
@RestController
@RequestMapping("/api/vip/webhook")
@CrossOrigin(origins = "*")
public class VipWebhookController {

    private final VipService vipService;
    private final String webhookSecret;

    public VipWebhookController(
            VipService vipService,
            @Value("${app.vip.webhook-secret:}") String webhookSecret
    ) {
        this.vipService = vipService;
        this.webhookSecret = webhookSecret == null ? "" : webhookSecret.trim();
    }

    @PostMapping("/bank-transfer")
    public ResponseEntity<BankTransferResult> confirmBankTransfer(
            @RequestHeader(value = "X-Webhook-Secret", required = false) String headerSecret,
            @RequestHeader(value = "X-Api-Key", required = false) String apiKey,
            @RequestHeader(value = "X-Casso-Secure-Token", required = false) String cassoToken,
            @RequestHeader(value = "Secure-Token", required = false) String secureToken,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, Object> payload
    ) {
        requireValidSecret(headerSecret, apiKey, cassoToken, secureToken, authorization);

        String content = asText(pick(payload,
                "content", "description", "transferContent", "transactionContent",
                "addInfo", "remark", "message"));
        Long amount = asAmount(pick(payload,
                "transferAmount", "amount", "creditAmount", "transfer_amount", "value"));
        String transactionId = asText(pick(payload,
                "referenceCode", "transactionId", "transaction_id", "reference_number", "tid", "id", "code"));
        String provider = asText(pick(payload,
                "gateway", "bankName", "bank", "source", "provider"));

        return ResponseEntity.ok(vipService.confirmBankTransfer(content, amount, transactionId, provider));
    }

    private void requireValidSecret(
            String headerSecret,
            String apiKey,
            String cassoToken,
            String secureToken,
            String authorization
    ) {
        if (webhookSecret.isBlank()) {
            throw ApiException.forbidden(
                    "Cổng xác nhận thanh toán chưa được cấu hình. Hãy đặt biến môi trường VIP_WEBHOOK_SECRET.");
        }

        String provided = firstNonBlank(
                headerSecret, apiKey, cassoToken, secureToken, bearerToken(authorization));
        if (provided == null || !constantTimeEquals(webhookSecret, provided.trim())) {
            throw ApiException.unauthorized("Mã xác thực webhook không đúng.");
        }
    }

    private String bearerToken(String authorization) {
        if (authorization == null) {
            return null;
        }
        String value = authorization.trim();
        if (value.toLowerCase(Locale.ROOT).startsWith("bearer ")) {
            return value.substring(7).trim();
        }
        return value;
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private Object pick(Map<String, Object> payload, String... keys) {
        if (payload == null) {
            return null;
        }
        for (String key : keys) {
            if (payload.containsKey(key) && payload.get(key) != null) {
                return payload.get(key);
            }
        }
        for (String container : new String[]{"data", "transaction", "payload"}) {
            Object nested = payload.get(container);
            if (nested instanceof Map<?, ?> map) {
                for (String key : keys) {
                    Object value = ((Map<String, Object>) map).get(key);
                    if (value != null) {
                        return value;
                    }
                }
            }
        }
        return null;
    }

    private String asText(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private Long asAmount(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        String digits = String.valueOf(value).replaceAll("[^0-9]", "");
        if (digits.isEmpty()) {
            return null;
        }
        try {
            return Long.parseLong(digits);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
