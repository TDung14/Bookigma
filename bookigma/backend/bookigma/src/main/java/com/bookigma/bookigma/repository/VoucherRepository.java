package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VoucherRepository extends JpaRepository<Voucher, Integer> {
    Optional<Voucher> findByCodeIgnoreCaseAndActiveTrue(String code);

    List<Voucher> findByActiveTrueOrderByMinOrderAmountAsc();
}
