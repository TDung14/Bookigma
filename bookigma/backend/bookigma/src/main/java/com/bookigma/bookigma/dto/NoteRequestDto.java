package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class NoteRequestDto {
    @Size(max = 255, message = "Ghi chú tối đa 255 ký tự")
    private String note;
}
