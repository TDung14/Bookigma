package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.dto.ExchangeListingRequestDto;
import com.bookigma.bookigma.dto.ExchangeListingResponseDto;
import com.bookigma.bookigma.dto.ExchangeOfferRequestDto;
import com.bookigma.bookigma.dto.ExchangeOfferResponseDto;
import com.bookigma.bookigma.dto.StatusUpdateRequestDto;
import com.bookigma.bookigma.service.ExchangeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Sàn trao đổi sách cũ P2P. */
@RestController
@RequestMapping("/api/exchanges")
@CrossOrigin(origins = "*")
public class ExchangeController {
    private final ExchangeService exchangeService;

    public ExchangeController(ExchangeService exchangeService) {
        this.exchangeService = exchangeService;
    }

    /** Tin đang mở. Nếu đã đăng nhập, mỗi tin kèm trạng thái đề nghị của chính người xem. */
    @GetMapping
    public ResponseEntity<List<ExchangeListingResponseDto>> getListings(@CurrentUserId(required = false) Long userId) {
        return ResponseEntity.ok(exchangeService.getOpenListings(userId));
    }

    /** Tin của tôi (mọi trạng thái) kèm các đề nghị đã nhận. */
    @GetMapping("/mine")
    public ResponseEntity<List<ExchangeListingResponseDto>> getMyListings(@CurrentUserId Long userId) {
        return ResponseEntity.ok(exchangeService.getMyListings(userId));
    }

    @PostMapping
    public ResponseEntity<ExchangeListingResponseDto> createListing(@CurrentUserId Long userId,
                                                                    @Valid @RequestBody ExchangeListingRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(exchangeService.createListing(userId, request));
    }

    /** Chủ tin đóng (CLOSED) hoặc mở lại (OPEN) tin của mình. */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ExchangeListingResponseDto> updateStatus(@CurrentUserId Long userId,
                                                                   @PathVariable Long id,
                                                                   @Valid @RequestBody StatusUpdateRequestDto request) {
        return ResponseEntity.ok(exchangeService.updateListingStatus(userId, id, request.getStatus()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteListing(@CurrentUserId Long userId, @PathVariable Long id) {
        exchangeService.deleteListing(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/offers")
    public ResponseEntity<ExchangeOfferResponseDto> sendOffer(@CurrentUserId Long userId,
                                                              @PathVariable Long id,
                                                              @Valid @RequestBody ExchangeOfferRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(exchangeService.sendOffer(userId, id, request));
    }

    @GetMapping("/offers/sent")
    public ResponseEntity<List<ExchangeOfferResponseDto>> getSentOffers(@CurrentUserId Long userId) {
        return ResponseEntity.ok(exchangeService.getSentOffers(userId));
    }

    @PatchMapping("/offers/{offerId}/accept")
    public ResponseEntity<ExchangeOfferResponseDto> acceptOffer(@CurrentUserId Long userId, @PathVariable Long offerId) {
        return ResponseEntity.ok(exchangeService.acceptOffer(userId, offerId));
    }

    @PatchMapping("/offers/{offerId}/reject")
    public ResponseEntity<ExchangeOfferResponseDto> rejectOffer(@CurrentUserId Long userId, @PathVariable Long offerId) {
        return ResponseEntity.ok(exchangeService.rejectOffer(userId, offerId));
    }

    @PatchMapping("/offers/{offerId}/cancel")
    public ResponseEntity<ExchangeOfferResponseDto> cancelOffer(@CurrentUserId Long userId, @PathVariable Long offerId) {
        return ResponseEntity.ok(exchangeService.cancelOffer(userId, offerId));
    }
}
