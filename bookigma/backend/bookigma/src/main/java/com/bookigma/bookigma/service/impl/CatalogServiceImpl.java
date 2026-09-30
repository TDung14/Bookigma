package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.CategoryResponseDto;
import com.bookigma.bookigma.dto.ShopResponseDto;
import com.bookigma.bookigma.dto.VoucherResponseDto;
import com.bookigma.bookigma.repository.CategoryRepository;
import com.bookigma.bookigma.repository.ShopRepository;
import com.bookigma.bookigma.repository.VoucherRepository;
import com.bookigma.bookigma.service.CatalogService;
import com.bookigma.bookigma.service.DtoMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CatalogServiceImpl implements CatalogService {
    private final CategoryRepository categoryRepository;
    private final ShopRepository shopRepository;
    private final VoucherRepository voucherRepository;

    public CatalogServiceImpl(CategoryRepository categoryRepository,
                              ShopRepository shopRepository,
                              VoucherRepository voucherRepository) {
        this.categoryRepository = categoryRepository;
        this.shopRepository = shopRepository;
        this.voucherRepository = voucherRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponseDto> getCategories() {
        return categoryRepository.findAllByOrderByIdAsc().stream()
                .map(category -> CategoryResponseDto.builder()
                        .id(category.getId())
                        .name(category.getName())
                        .slug(category.getSlug())
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShopResponseDto> getShops() {
        return shopRepository.findAllByOrderByIdAsc().stream()
                .map(shop -> ShopResponseDto.builder()
                        .id(shop.getId())
                        .name(shop.getName())
                        .ownerId(shop.getOwner().getId())
                        .avatarUrl(shop.getAvatarUrl())
                        .description(shop.getDescription())
                        .rating(shop.getRating())
                        .followers(shop.getFollowerCount())
                        .verified(shop.getVerified())
                        .createdAt(shop.getCreatedAt())
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoucherResponseDto> getVouchers() {
        return voucherRepository.findByActiveTrueOrderByMinOrderAmountAsc().stream()
                .map(voucher -> VoucherResponseDto.builder()
                        .code(voucher.getCode())
                        .label(voucher.getLabel())
                        .type(DtoMapper.lower(voucher.getDiscountType()))
                        .value(voucher.getDiscountValue())
                        .maxDiscount(voucher.getMaxDiscount())
                        .minOrder(voucher.getMinOrderAmount())
                        .build())
                .toList();
    }
}
