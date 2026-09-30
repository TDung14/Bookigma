package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.ExchangeListingRequestDto;
import com.bookigma.bookigma.dto.ExchangeListingResponseDto;
import com.bookigma.bookigma.dto.ExchangeOfferRequestDto;
import com.bookigma.bookigma.dto.ExchangeOfferResponseDto;

import java.util.List;

public interface ExchangeService {
    // Tin đăng
    List<ExchangeListingResponseDto> getOpenListings(Long viewerId);
    List<ExchangeListingResponseDto> getMyListings(Long userId);
    ExchangeListingResponseDto createListing(Long userId, ExchangeListingRequestDto request);
    ExchangeListingResponseDto updateListingStatus(Long userId, Long listingId, String status);
    void deleteListing(Long userId, Long listingId);

    // Đề nghị trao đổi
    ExchangeOfferResponseDto sendOffer(Long userId, Long listingId, ExchangeOfferRequestDto request);
    List<ExchangeOfferResponseDto> getSentOffers(Long userId);
    ExchangeOfferResponseDto acceptOffer(Long userId, Long offerId);
    ExchangeOfferResponseDto rejectOffer(Long userId, Long offerId);
    ExchangeOfferResponseDto cancelOffer(Long userId, Long offerId);
}
