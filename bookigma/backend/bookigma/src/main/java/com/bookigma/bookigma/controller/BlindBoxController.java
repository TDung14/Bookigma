package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.dto.BlindBoxMatchRequestDto;
import com.bookigma.bookigma.dto.BlindBoxResponseDto;
import com.bookigma.bookigma.service.BlindBoxService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/blind-boxes")
@CrossOrigin(origins = "*")
public class BlindBoxController {
    private final BlindBoxService blindBoxService;

    public BlindBoxController(BlindBoxService blindBoxService) {
        this.blindBoxService = blindBoxService;
    }

    @PostMapping("/match")
    public ResponseEntity<BlindBoxResponseDto> match(@CurrentUserId Long userId,
                                                     @Valid @RequestBody BlindBoxMatchRequestDto request) {
        return ResponseEntity.ok(blindBoxService.match(userId, request));
    }
}
