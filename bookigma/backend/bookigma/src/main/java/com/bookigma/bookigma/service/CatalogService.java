package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.CategoryResponseDto;
import com.bookigma.bookigma.dto.ShopResponseDto;
import com.bookigma.bookigma.dto.VoucherResponseDto;

import java.util.List;

public interface CatalogService {
    List<CategoryResponseDto> getCategories();
    List<ShopResponseDto> getShops();
    List<VoucherResponseDto> getVouchers();
}
