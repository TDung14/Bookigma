package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.BlindBoxMatchRequestDto;
import com.bookigma.bookigma.dto.BlindBoxResponseDto;

public interface BlindBoxService {
    /**
     * Ghép một cuốn sách vào hộp theo tâm trạng + mức hộp. Gửi kèm boxId để ghép lại
     * ("Đổi cuốn khác") trên chính hộp đang xem. Kết quả chỉ có manh mối, không có tên sách.
     */
    BlindBoxResponseDto match(Long userId, BlindBoxMatchRequestDto request);
}
