package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ExchangeListingResponseDto {
    private Long id;
    private String bookTitle;
    private String wanted;
    private String condition;
    private String location;
    private String coverUrl;
    private String note;
    /** open | traded | closed */
    private String status;
    private LocalDateTime createdAt;
    private UserSummaryDto owner;
    private long pendingOffers;
    /** Trạng thái đề nghị của người đang xem với tin này (null nếu chưa gửi). */
    private String myOfferStatus;
    /** Chỉ có khi chủ tin xem danh sách tin của mình. */
    private List<ExchangeOfferResponseDto> offers;
}
