package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class BlindBoxMatchRequestDto {
    @NotBlank(message = "Hãy chọn tâm trạng")
    private String moodId;

    @NotBlank(message = "Hãy chọn mức hộp")
    private String tierId;

    /** Id hộp đang xem — gửi kèm khi bấm "Đổi cuốn khác" để ghép lại trên chính hộp đó. */
    private Long boxId;

    /** Những cuốn người dùng đã đọc (tiến trình đọc đang lưu ở trình duyệt) để không ghép trùng. */
    private List<Long> excludeBookIds;
}
