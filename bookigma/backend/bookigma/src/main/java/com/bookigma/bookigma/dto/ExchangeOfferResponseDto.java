package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ExchangeOfferResponseDto {
    private Long id;
    private Long listingId;
    private String listingTitle;
    private String listingCoverUrl;
    private String listingStatus;
    private UserSummaryDto owner;
    private UserSummaryDto sender;
    private String offeredBook;
    private String message;
    /** pending | accepted | rejected | cancelled */
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;
    /** Email của bên còn lại, chỉ có khi đề nghị đã được chấp nhận để hai bên hẹn trao đổi. */
    private String contactEmail;
}
