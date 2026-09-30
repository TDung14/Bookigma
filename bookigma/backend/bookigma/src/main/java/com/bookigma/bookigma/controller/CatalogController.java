package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.dto.CategoryResponseDto;
import com.bookigma.bookigma.dto.ShopResponseDto;
import com.bookigma.bookigma.dto.VoucherResponseDto;
import com.bookigma.bookigma.service.CatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Dữ liệu tham chiếu của cửa hàng: thể loại, danh sách shop, mã giảm giá. */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CatalogController {
    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryResponseDto>> getCategories() {
        return ResponseEntity.ok(catalogService.getCategories());
    }

    @GetMapping("/shops")
    public ResponseEntity<List<ShopResponseDto>> getShops() {
        return ResponseEntity.ok(catalogService.getShops());
    }

    @GetMapping("/vouchers")
    public ResponseEntity<List<VoucherResponseDto>> getVouchers() {
        return ResponseEntity.ok(catalogService.getVouchers());
    }
}
