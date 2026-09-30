package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.ExchangeListingRequestDto;
import com.bookigma.bookigma.dto.ExchangeListingResponseDto;
import com.bookigma.bookigma.dto.ExchangeOfferRequestDto;
import com.bookigma.bookigma.dto.ExchangeOfferResponseDto;
import com.bookigma.bookigma.entity.ExchangeListing;
import com.bookigma.bookigma.entity.ExchangeOffer;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.repository.ExchangeListingRepository;
import com.bookigma.bookigma.repository.ExchangeOfferRepository;
import com.bookigma.bookigma.service.AccessGuard;
import com.bookigma.bookigma.service.DtoMapper;
import com.bookigma.bookigma.service.ExchangeService;
import com.bookigma.bookigma.service.InputUtils;
import com.bookigma.bookigma.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExchangeServiceImpl implements ExchangeService {
    private static final String MINE_LINK = "/exchange?tab=mine";
    private static final String SENT_LINK = "/exchange?tab=sent";

    private final ExchangeListingRepository listingRepository;
    private final ExchangeOfferRepository offerRepository;
    private final AccessGuard accessGuard;
    private final NotificationService notificationService;

    public ExchangeServiceImpl(ExchangeListingRepository listingRepository,
                               ExchangeOfferRepository offerRepository,
                               AccessGuard accessGuard,
                               NotificationService notificationService) {
        this.listingRepository = listingRepository;
        this.offerRepository = offerRepository;
        this.accessGuard = accessGuard;
        this.notificationService = notificationService;
    }

    // ---------- Tin đăng ----------

    @Override
    @Transactional(readOnly = true)
    public List<ExchangeListingResponseDto> getOpenListings(Long viewerId) {
        Map<Long, Long> pendingByListing = new HashMap<>();
        for (Object[] row : offerRepository.countByStatusGroupByListing(ExchangeOffer.Status.PENDING)) {
            pendingByListing.put((Long) row[0], (Long) row[1]);
        }

        // Đề nghị mới nhất của người đang xem với từng tin, để giao diện hiện "Đã gửi đề nghị"
        Map<Long, ExchangeOffer.Status> myOfferByListing = new HashMap<>();
        if (viewerId != null) {
            for (ExchangeOffer offer : offerRepository.findBySender_IdOrderByCreatedAtDesc(viewerId)) {
                myOfferByListing.putIfAbsent(offer.getListing().getId(), offer.getStatus());
            }
        }

        return listingRepository.findByStatusOrderByCreatedAtDesc(ExchangeListing.Status.OPEN).stream()
                .map(listing -> toListingDto(listing,
                        pendingByListing.getOrDefault(listing.getId(), 0L),
                        myOfferByListing.get(listing.getId()),
                        null))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExchangeListingResponseDto> getMyListings(Long userId) {
        accessGuard.requireUser(userId);
        return listingRepository.findByOwner_IdOrderByCreatedAtDesc(userId).stream()
                .map(listing -> toOwnListingDto(listing, userId))
                .toList();
    }

    @Override
    @Transactional
    public ExchangeListingResponseDto createListing(Long userId, ExchangeListingRequestDto request) {
        User owner = accessGuard.requireUser(userId);
        ExchangeListing listing = ExchangeListing.builder()
                .owner(owner)
                .bookTitle(request.getBookTitle().trim())
                .wanted(request.getWanted().trim())
                .condition(request.getCondition().trim())
                .location(request.getLocation().trim())
                .coverUrl(InputUtils.optionalHttpUrl(request.getCoverUrl()))
                .note(InputUtils.blankToNull(request.getNote()))
                .status(ExchangeListing.Status.OPEN)
                .build();
        return toListingDto(listingRepository.save(listing), 0, null, List.of());
    }

    @Override
    @Transactional
    public ExchangeListingResponseDto updateListingStatus(Long userId, Long listingId, String status) {
        ExchangeListing listing = findOwnListing(userId, listingId);
        ExchangeListing.Status next = InputUtils.parseEnum(ExchangeListing.Status.class, status,
                "Trạng thái tin không hợp lệ.");
        if (next == ExchangeListing.Status.TRADED) {
            throw ApiException.badRequest("Tin chỉ chuyển sang \"đã trao đổi\" khi bạn chấp nhận một đề nghị.");
        }
        if (listing.getStatus() == ExchangeListing.Status.TRADED) {
            throw ApiException.conflict("Tin này đã chốt trao đổi, không thể mở lại.");
        }
        if (listing.getStatus() != next) {
            listing.setStatus(next);
            if (next == ExchangeListing.Status.CLOSED) {
                rejectPendingOffers(listing, null, "Tin \"" + listing.getBookTitle()
                        + "\" đã được chủ tin đóng, đề nghị của bạn không còn hiệu lực.");
            }
        }
        return toOwnListingDto(listing, userId);
    }

    @Override
    @Transactional
    public void deleteListing(Long userId, Long listingId) {
        listingRepository.delete(findOwnListing(userId, listingId));
    }

    // ---------- Đề nghị trao đổi ----------

    @Override
    @Transactional
    public ExchangeOfferResponseDto sendOffer(Long userId, Long listingId, ExchangeOfferRequestDto request) {
        User sender = accessGuard.requireUser(userId);
        ExchangeListing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy tin trao đổi."));
        if (listing.getOwner().getId().equals(userId)) {
            throw ApiException.badRequest("Bạn không thể gửi đề nghị cho tin của chính mình.");
        }
        if (listing.getStatus() != ExchangeListing.Status.OPEN) {
            throw ApiException.conflict("Tin này đã đóng, không nhận thêm đề nghị.");
        }
        if (offerRepository.existsByListing_IdAndSender_IdAndStatus(listingId, userId, ExchangeOffer.Status.PENDING)) {
            throw ApiException.conflict("Bạn đã gửi đề nghị cho tin này rồi, hãy chờ chủ tin phản hồi.");
        }

        ExchangeOffer offer = offerRepository.save(ExchangeOffer.builder()
                .listing(listing)
                .sender(sender)
                .offeredBook(request.getOfferedBook().trim())
                .message(InputUtils.blankToNull(request.getMessage()))
                .status(ExchangeOffer.Status.PENDING)
                .build());

        notificationService.createNotification(listing.getOwner().getId(),
                DtoMapper.displayName(sender) + " muốn đổi \"" + offer.getOfferedBook() + "\" lấy \""
                        + listing.getBookTitle() + "\" của bạn.",
                MINE_LINK);
        return toOfferDto(offer, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExchangeOfferResponseDto> getSentOffers(Long userId) {
        accessGuard.requireUser(userId);
        return offerRepository.findBySender_IdOrderByCreatedAtDesc(userId).stream()
                .map(offer -> toOfferDto(offer, userId))
                .toList();
    }

    @Override
    @Transactional
    public ExchangeOfferResponseDto acceptOffer(Long userId, Long offerId) {
        ExchangeOffer offer = findPendingOfferForOwner(userId, offerId);
        ExchangeListing listing = offer.getListing();
        if (listing.getStatus() != ExchangeListing.Status.OPEN) {
            throw ApiException.conflict("Tin này đã đóng, không thể chấp nhận thêm đề nghị.");
        }

        offer.setStatus(ExchangeOffer.Status.ACCEPTED);
        offer.setRespondedAt(LocalDateTime.now());
        listing.setStatus(ExchangeListing.Status.TRADED);

        notificationService.createNotification(offer.getSender().getId(),
                DtoMapper.displayName(listing.getOwner()) + " đã đồng ý đổi \"" + listing.getBookTitle()
                        + "\" với bạn! Liên hệ để hẹn trao đổi nhé.",
                SENT_LINK);
        rejectPendingOffers(listing, offer.getId(), "Tin \"" + listing.getBookTitle()
                + "\" đã chốt trao đổi với người khác, đề nghị của bạn chưa được chọn.");
        return toOfferDto(offer, userId);
    }

    @Override
    @Transactional
    public ExchangeOfferResponseDto rejectOffer(Long userId, Long offerId) {
        ExchangeOffer offer = findPendingOfferForOwner(userId, offerId);
        offer.setStatus(ExchangeOffer.Status.REJECTED);
        offer.setRespondedAt(LocalDateTime.now());

        ExchangeListing listing = offer.getListing();
        notificationService.createNotification(offer.getSender().getId(),
                DtoMapper.displayName(listing.getOwner()) + " đã từ chối đề nghị đổi \"" + offer.getOfferedBook()
                        + "\" lấy \"" + listing.getBookTitle() + "\".",
                SENT_LINK);
        return toOfferDto(offer, userId);
    }

    @Override
    @Transactional
    public ExchangeOfferResponseDto cancelOffer(Long userId, Long offerId) {
        ExchangeOffer offer = offerRepository.findWithListingById(offerId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đề nghị trao đổi."));
        if (!offer.getSender().getId().equals(userId)) {
            throw ApiException.notFound("Không tìm thấy đề nghị trao đổi.");
        }
        if (offer.getStatus() != ExchangeOffer.Status.PENDING) {
            throw ApiException.conflict("Chỉ rút lại được đề nghị đang chờ phản hồi.");
        }
        offer.setStatus(ExchangeOffer.Status.CANCELLED);
        offer.setRespondedAt(LocalDateTime.now());
        return toOfferDto(offer, userId);
    }

    // ---------- Nội bộ ----------

    private ExchangeListing findOwnListing(Long userId, Long listingId) {
        accessGuard.requireUser(userId);
        ExchangeListing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy tin trao đổi."));
        if (!listing.getOwner().getId().equals(userId)) {
            throw ApiException.forbidden("Bạn chỉ thao tác được trên tin của chính mình.");
        }
        return listing;
    }

    private ExchangeOffer findPendingOfferForOwner(Long userId, Long offerId) {
        accessGuard.requireUser(userId);
        ExchangeOffer offer = offerRepository.findWithListingById(offerId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đề nghị trao đổi."));
        if (!offer.getListing().getOwner().getId().equals(userId)) {
            throw ApiException.forbidden("Chỉ chủ tin mới phản hồi được đề nghị này.");
        }
        if (offer.getStatus() != ExchangeOffer.Status.PENDING) {
            throw ApiException.conflict("Đề nghị này đã được xử lý.");
        }
        return offer;
    }

    private void rejectPendingOffers(ExchangeListing listing, Long exceptOfferId, String message) {
        for (ExchangeOffer other : offerRepository.findByListing_IdAndStatus(listing.getId(), ExchangeOffer.Status.PENDING)) {
            if (other.getId().equals(exceptOfferId)) {
                continue;
            }
            other.setStatus(ExchangeOffer.Status.REJECTED);
            other.setRespondedAt(LocalDateTime.now());
            notificationService.createNotification(other.getSender().getId(), message, SENT_LINK);
        }
    }

    private ExchangeListingResponseDto toOwnListingDto(ExchangeListing listing, Long ownerId) {
        List<ExchangeOfferResponseDto> offers = listing.getOffers().stream()
                .map(offer -> toOfferDto(offer, ownerId))
                .toList();
        long pending = listing.getOffers().stream()
                .filter(offer -> offer.getStatus() == ExchangeOffer.Status.PENDING)
                .count();
        return toListingDto(listing, pending, null, offers);
    }

    private ExchangeListingResponseDto toListingDto(ExchangeListing listing,
                                                    long pendingOffers,
                                                    ExchangeOffer.Status myOfferStatus,
                                                    List<ExchangeOfferResponseDto> offers) {
        return ExchangeListingResponseDto.builder()
                .id(listing.getId())
                .bookTitle(listing.getBookTitle())
                .wanted(listing.getWanted())
                .condition(listing.getCondition())
                .location(listing.getLocation())
                .coverUrl(listing.getCoverUrl())
                .note(listing.getNote())
                .status(DtoMapper.lower(listing.getStatus()))
                .createdAt(listing.getCreatedAt())
                .owner(DtoMapper.toUserSummary(listing.getOwner()))
                .pendingOffers(pendingOffers)
                .myOfferStatus(DtoMapper.lower(myOfferStatus))
                .offers(offers)
                .build();
    }

    private ExchangeOfferResponseDto toOfferDto(ExchangeOffer offer, Long viewerId) {
        ExchangeListing listing = offer.getListing();
        User owner = listing.getOwner();
        User sender = offer.getSender();

        // Email chỉ lộ cho hai bên khi đã chốt trao đổi, để họ tự hẹn gặp / gửi sách
        String contactEmail = null;
        if (offer.getStatus() == ExchangeOffer.Status.ACCEPTED) {
            if (viewerId.equals(sender.getId())) {
                contactEmail = owner.getEmail();
            } else if (viewerId.equals(owner.getId())) {
                contactEmail = sender.getEmail();
            }
        }

        return ExchangeOfferResponseDto.builder()
                .id(offer.getId())
                .listingId(listing.getId())
                .listingTitle(listing.getBookTitle())
                .listingCoverUrl(listing.getCoverUrl())
                .listingStatus(DtoMapper.lower(listing.getStatus()))
                .owner(DtoMapper.toUserSummary(owner))
                .sender(DtoMapper.toUserSummary(sender))
                .offeredBook(offer.getOfferedBook())
                .message(offer.getMessage())
                .status(DtoMapper.lower(offer.getStatus()))
                .createdAt(offer.getCreatedAt())
                .respondedAt(offer.getRespondedAt())
                .contactEmail(contactEmail)
                .build();
    }
}
