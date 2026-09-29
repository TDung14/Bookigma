-- ========================================================
-- 10. CHÈN DỮ LIỆU MẪU (MOCK DATA)
-- ========================================================

-- Gói dịch vụ
INSERT INTO subscription_plans (plan_id, name, price, duration_days, description, max_reading_limit) VALUES
(1, 'Gói Miễn Phí (Standard Free)', 0.00, 3650, 'Đọc các đầu sách kinh điển cộng đồng, tham gia thảo luận nhóm.', 3),
(2, 'Gói Mọt Sách Tháng (Bookworm Monthly)', 59000.00, 30, 'Đọc toàn bộ kho sách VIP không giới hạn, không có quảng cáo trong 30 ngày.', NULL),
(3, 'Gói Mọt Sách Quý (Bookworm Quarterly)', 159000.00, 90, 'Tiết kiệm 10%, mở khóa toàn bộ sách VIP và huy hiệu độc quyền.', NULL),
(4, 'Gói Học Giả Năm (Scholar Yearly)', 599000.00, 365, 'Đọc sách VIP không giới hạn cả năm, giảm giá 10% khi mua sách giấy, đổi sách ưu tiên.', NULL);

-- Người dùng
INSERT INTO users (user_id, username, email, password_hash, full_name, avatar_url, bio, role, is_active) VALUES
(1, 'admin_bookigma', 'admin@bookigma.vn', '$2a$12$e8Y5M6vjZ9/exampleAdminHash123', 'Quản Trị Viên', 'https://avatar.iran.liara.run/public/boy?username=admin', 'Quản trị viên phát triển nền tảng Bookigma.', 'ADMIN', 1),
(2, 'mod_quynhanh', 'quynhanh.mod@bookigma.vn', '$2a$12$e8Y5M6vjZ9/exampleModHash456', 'Nguyễn Quỳnh Anh', 'https://avatar.iran.liara.run/public/girl?username=quynhanh', 'Chuyên viên kiểm duyệt nội dung cộng đồng & sách bản quyền.', 'MODERATOR', 1),
(3, 'hoang_nam_book', 'nam.hoang98@gmail.com', '$2a$12$e8Y5M6vjZ9/exampleUserHash789', 'Hoàng Hải Nam', 'https://avatar.iran.liara.run/public/boy?username=nam', 'Mọt sách kinh tế, tâm lý học và tiểu thuyết trinh thám.', 'USER', 1),
(4, 'thuy_tien_reads', 'tien.thuy@gmail.com', '$2a$12$e8Y5M6vjZ9/exampleUserHash101', 'Đỗ Thủy Tiên', 'https://avatar.iran.liara.run/public/girl?username=tien', 'Reviewer sách tự do, yêu thích văn học lãng mạn phương Tây.', 'USER', 1),
(5, 'minh_tri_coder', 'tri.dev@outlook.com', '$2a$12$e8Y5M6vjZ9/exampleUserHash102', 'Lê Minh Trí', 'https://avatar.iran.liara.run/public/boy?username=tri', 'Software Engineer, sưu tầm sách công nghệ & triết học.', 'USER', 1),
(6, 'ha_my_art', 'hamy.design@gmail.com', '$2a$12$e8Y5M6vjZ9/exampleUserHash103', 'Phạm Hà My', 'https://avatar.iran.liara.run/public/girl?username=hamey', 'Họa sĩ minh họa bìa sách và truyện tranh lịch sử.', 'USER', 1),
(7, 'quang_huy_invest', 'huy.invest@vnn.vn', '$2a$12$e8Y5M6vjZ9/exampleUserHash104', 'Vũ Quang Huy', 'https://avatar.iran.liara.run/public/boy?username=huy', 'Đọc sách tài chính, chứng khoán và quản trị kinh doanh.', 'USER', 1),
(8, 'ngoc_mai_poetry', 'mai.ngoc@gmail.com', '$2a$12$e8Y5M6vjZ9/exampleUserHash105', 'Bùi Ngọc Mai', 'https://avatar.iran.liara.run/public/girl?username=mai', 'Tâm hồn yêu thơ ca cổ điển và văn học thiếu nhi.', 'USER', 1);

-- Điểm thưởng & Bảng xếp hạng
INSERT INTO user_points (user_id, total_points, monthly_points, current_tier) VALUES
(1, 0, 0, 'Quản Trị'),
(2, 450, 120, 'Hộ Vệ Sách'),
(3, 2450, 680, 'Mọt Sách Vàng'),
(4, 1820, 510, 'Học Giả Bạc'),
(5, 1200, 340, 'Mọt Sách Đồng'),
(6, 620, 180, 'Tập Sự'),
(7, 890, 220, 'Học Giả Bạc'),
(8, 310, 90, 'Tập Sự');

-- Gói đăng ký của người dùng
INSERT INTO user_subscriptions (user_id, plan_id, start_date, end_date, status) VALUES
(3, 4, NOW() - INTERVAL 30 DAY, NOW() + INTERVAL 335 DAY, 'ACTIVE'),
(4, 2, NOW() - INTERVAL 10 DAY, NOW() + INTERVAL 20 DAY, 'ACTIVE'),
(5, 3, NOW() - INTERVAL 5 DAY, NOW() + INTERVAL 85 DAY, 'ACTIVE'),
(6, 1, NOW() - INTERVAL 60 DAY, NOW() + INTERVAL 3000 DAY, 'ACTIVE'),
(7, 2, NOW() - INTERVAL 40 DAY, NOW() - INTERVAL 10 DAY, 'EXPIRED'),
(8, 1, NOW() - INTERVAL 15 DAY, NOW() + INTERVAL 3000 DAY, 'ACTIVE');

-- Thể loại & Tác giả
INSERT INTO categories (category_id, name, slug) VALUES
(1, 'Văn Học & Tiểu Thuyết', 'van-hoc-tieu-thuyet'),
(2, 'Kinh Tế & Đầu Tư', 'kinh-te-dau-tu'),
(3, 'Tâm Lý & Kỹ Năng Sống', 'tam-ly-ky-nang-song'),
(4, 'Công Nghệ Thông Tin', 'cong-nghe-thong-tin'),
(5, 'Khoa Học Viễn Tưởng', 'khoa-hoc-vien-tuong'),
(6, 'Lịch Sử & Triết Học', 'lich-su-triet-hoc');

INSERT INTO authors (author_id, name, bio) VALUES
(1, 'Nguyễn Nhật Ánh', 'Nhà văn thiếu nhi và thanh thiếu niên gạo cội Việt Nam.'),
(2, 'James Clear', 'Tác giả, doanh nhân chuyên nghiên cứu về thói quen và năng suất.'),
(3, 'Robert C. Martin', 'Kỹ sư phần mềm kỳ cựu, đồng tác giả Tuyên ngôn Agile.'),
(4, 'Morgan Housel', 'Chuyên gia tài chính, cựu phóng viên của The Wall Street Journal.'),
(5, 'George Orwell', 'Nhà văn, nhà báo chính luận nổi tiếng thế giới thế kỷ 20.');

-- Sách
INSERT INTO books (book_id, title, author_id, category_id, description, cover_image_url, is_digital, is_for_sale, sale_price, stock_quantity, requires_vip) VALUES
(1, 'Mắt Biếc', 1, 1, 'Tác phẩm nổi tiếng về chuyện tình đơn phương đầy trăn trở của Ngạn dành cho Hà Lan.', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c', 1, 1, 95000.00, 30, 0),
(2, 'Cho Tôi Xin Một Vé Đi Tuổi Thơ', 1, 1, 'Chuyến tàu chở ký ức trong trẻo và những bài học hồn nhiên về cuộc sống thời thơ ấu.', 'https://images.unsplash.com/photo-1512820790803-83ca734da794', 1, 1, 85000.00, 18, 0),
(3, 'Atomic Habits - Thói Quen Nguyên Tử', 2, 3, 'Cách mạng hóa cuộc sống thông qua những thay đổi tí hon tích lũy theo cấp số nhân.', 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a', 1, 1, 179000.00, 45, 1),
(4, 'Tâm Lý Học Về Tiền (The Psychology of Money)', 4, 2, 'Những bài học đắt giá về sự thịnh vượng, lòng tham và hạnh phúc.', 'https://images.unsplash.com/photo-1553729459-efe14ef6055d', 1, 1, 165000.00, 25, 1),
(5, 'Clean Code - Mã Sạch', 3, 4, 'Cẩm nang dành cho lập trình viên muốn nâng tầm chất lượng code chuyên nghiệp.', 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4', 1, 1, 280000.00, 12, 1),
(6, '1984', 5, 5, 'Bức tranh kinh điển về một xã hội bị kiểm soát toàn trị giả tưởng rúng động.', 'https://images.unsplash.com/photo-1495640388908-05fa85288e61', 1, 0, 0.00, 0, 0),
(7, 'Chuyện Nông Trại (Animal Farm)', 5, 1, 'Truyện ngụ ngôn chính trị kinh điển thế giới với nhiều tầng ý nghĩa sâu xa.', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f', 1, 1, 75000.00, 20, 0);

-- Mục lục chương đọc online
INSERT INTO book_chapters (book_id, chapter_index, title, content_text) VALUES
(3, 1, 'Chương 1: Sức Mạnh Phi Thường Của Thói Quen Nhỏ 1%', 'Rất dễ để phóng đại tầm quan trọng của một khoảnh khắc quyết định và đánh giá thấp giá trị của việc cải thiện từng chút một mỗi ngày...'),
(3, 2, 'Chương 2: Thói Quen Định Hình Bản Sắc Của Bạn Như Thế Nào', 'Lý do cốt lõi khiến việc thay đổi thói quen khó khăn không nằm ở kỹ thuật, mà nằm ở việc bạn cố gắng thay đổi sai điều...'),
(4, 1, 'Chương 1: Không Ai Bị Điên Cả', 'Trải nghiệm cá nhân của mỗi người về tiền bạc chỉ chiếm một phần rất nhỏ những gì đã diễn ra, nhưng nó định hình cách bạn nghĩ tiền tệ vận hành...'),
(5, 1, 'Chương 1: Tại Sao Cần Viết Code Sạch?', 'Bạn đọc code nhiều gấp mười lần bạn viết code mới. Do đó, làm cho code dễ đọc sẽ giúp việc viết code nhanh hơn...');

-- Tiến độ đọc sách
INSERT INTO reading_progress (user_id, book_id, current_chapter_id, last_position, percent_completed) VALUES
(3, 3, 2, 'Trang 48', 42.00),
(4, 4, 1, 'Trang 18', 20.50),
(5, 5, 1, 'Trang 30', 30.00);

-- Pages & Hội nhóm
INSERT INTO pages (page_id, owner_id, name, slug, bio, avatar_url, is_verified) VALUES
(1, 1, 'NXB Tri Thức Trẻ', 'nxb-tri-thuc-tre', 'Trang chính thức cập nhật các đầu sách dịch mới và chương trình ưu đãi độc quyền.', 'https://avatar.iran.liara.run/public/job/designer/female', 1),
(2, 4, 'Góc Sách Thủy Tiên', 'goc-sach-thuy-tien', 'Kênh chia sẻ cảm nhận sách, trích dẫn hay và trao đổi sách văn học.', 'https://avatar.iran.liara.run/public/girl?username=tienpage', 0);

INSERT INTO page_admins (page_id, user_id, role) VALUES
(1, 1, 'OWNER'),
(1, 2, 'MODERATOR'),
(2, 4, 'OWNER');

INSERT INTO book_clubs (club_id, name, description, cover_url, owner_id, is_private) VALUES
(1, 'Hội Những Người Nghiện Sách Kinh Doanh & Đầu Tư', 'Cùng nhau đọc, thảo luận case-study thực tế từ các cuốn sách kinh tế hàng đầu.', 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f', 7, 0),
(2, 'CLB Trinh Thám & Tội Phạm Học', 'Nơi hội tụ các thám tử nghiệp dư mổ xẻ những tình tiết bí ẩn trong tiểu thuyết ly kỳ.', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5', 4, 0),
(3, 'Cộng Đồng Lập Trình Viên Đọc Sách', 'Đọc sách kiến trúc hệ thống, Clean Code, Design Patterns và công nghệ mới.', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c', 5, 1);

INSERT INTO club_members (club_id, user_id, role) VALUES
(1, 7, 'OWNER'),
(1, 3, 'ADMIN'),
(1, 5, 'MEMBER'),
(2, 4, 'OWNER'),
(2, 3, 'MEMBER'),
(2, 8, 'MEMBER'),
(3, 5, 'OWNER'),
(3, 3, 'MEMBER');

-- Bài đăng
INSERT INTO posts (post_id, user_id, page_id, club_id, book_id, content, media_url, visibility, created_at) VALUES
(1, 3, NULL, NULL, 3, 'Cuốn Atomic Habits thực sự thay đổi tư duy làm việc của mình! Mình đã duy trì thói quen đọc 30 trang sách mỗi tối liên tục suốt 45 ngày.', 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6', 'PUBLIC', NOW(6) - INTERVAL 2 DAY),
(2, 4, NULL, 2, 6, 'Mọi người nghĩ sao về hồi kết của 1984? Nó quá tăm tối hay phản ánh chân thực bản chất của sự khuất phục tâm lý?', NULL, 'CLUB_ONLY', NOW(6) - INTERVAL 1 DAY),
(3, 7, NULL, 1, 4, 'Trích đoạn tâm đắc: "Tiêu tiền để khoe khoang rằng bạn có tiền là cách nhanh nhất để bạn có ít tiền hơn."', 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44', 'PUBLIC', NOW(6) - INTERVAL 18 HOUR),
(4, 5, NULL, 3, 5, 'Khuyên thật lòng các bạn Junior nên đọc kỹ 3 chương đầu của Clean Code trước khi push code lên production.', NULL, 'CLUB_ONLY', NOW(6) - INTERVAL 6 HOUR),
(5, 6, NULL, NULL, 1, 'Hôm nay trời mưa rào, ngồi vẽ lại bức tranh minh họa cảnh làng Đo Đo trong truyện Mắt Biếc.', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f', 'PUBLIC', NOW(6) - INTERVAL 2 HOUR);

-- Tương tác react & Bình luận
INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES
(1, 4, 'LOVE'),
(1, 5, 'LIKE'),
(1, 7, 'BOOKWORM'),
(2, 3, 'INSIGHTFUL'),
(2, 8, 'BOOKWORM'),
(3, 3, 'LIKE'),
(3, 4, 'LOVE'),
(3, 5, 'INSIGHTFUL');

INSERT INTO comments (comment_id, post_id, user_id, parent_comment_id, content, created_at) VALUES
(1, 1, 4, NULL, 'Chúc mừng anh Nam nhé, em cũng áp dụng quy tắc 2 phút thấy hiệu quả cực kỳ!', NOW() - INTERVAL 40 HOUR),
(2, 1, 3, 1, 'Cảm ơn Tiên! Ban đầu hơi gượng gạo tí nhưng qua tuần thứ hai là vào nếp ngay.', NOW() - INTERVAL 38 HOUR),
(3, 1, 5, NULL, 'Bác có đọc bản tiếng Anh hay bản dịch vậy?', NOW() - INTERVAL 30 HOUR),
(4, 1, 3, 3, 'Mình đọc bản dịch trên app Bookigma luôn, dịch khá mượt và sát nghĩa.', NOW() - INTERVAL 29 HOUR);

-- Tin 24h (Stories)
INSERT INTO stories (story_id, user_id, media_url, caption, expires_at, created_at) VALUES
(1, 3, 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6', 'Cà phê sáng cùng cuốn sách yêu thích ☕', NOW() + INTERVAL 18 HOUR, NOW() - INTERVAL 6 HOUR),
(2, 4, 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d', 'Vừa săn được cuốn sách cũ này ở Đinh Lễ, vui quá chừng!', NOW() + INTERVAL 22 HOUR, NOW() - INTERVAL 2 HOUR);

INSERT INTO story_views (story_id, user_id, viewed_at) VALUES
(1, 4, NOW() - INTERVAL 5 HOUR),
(1, 5, NOW() - INTERVAL 4 HOUR);

-- Đơn hàng & Chi tiết đơn
INSERT INTO orders (order_id, user_id, total_amount, shipping_address, status, payment_method, created_at) VALUES
(1, 3, 274000.00, 'Tòa nhà Landmark 81, P. 22, Q. Bình Thạnh, TP.HCM', 'COMPLETED', 'MOMO', NOW() - INTERVAL 10 DAY),
(2, 7, 165000.00, 'Số 25 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội', 'SHIPPED', 'VNPAY', NOW() - INTERVAL 1 DAY);

INSERT INTO order_items (order_id, book_id, quantity, unit_price) VALUES
(1, 1, 1, 95000.00),
(1, 3, 1, 179000.00),
(2, 4, 1, 165000.00);

-- Trao đổi sách
INSERT INTO exchange_requests (exchange_id, sender_id, receiver_id, offered_book_id, requested_book_id, note, status, created_at) VALUES
(1, 3, 5, 1, 5, 'Chào Trí, mình vừa đọc xong cuốn Mắt Biếc, sách còn mới 99%. Muốn đổi lấy cuốn Clean Code của bạn nhé!', 'PENDING', NOW() - INTERVAL 1 DAY);

-- Lịch sử điểm thưởng
INSERT INTO user_activities (user_id, activity_type, points_awarded, created_at) VALUES
(3, 'READ_CHAPTER', 20, NOW() - INTERVAL 2 DAY),
(3, 'CREATE_POST', 50, NOW() - INTERVAL 2 DAY),
(4, 'CREATE_POST', 50, NOW() - INTERVAL 1 DAY);

-- Thông báo (Notifications)
INSERT INTO `notifications` (`user_id`, `message`, `is_read`, `created_at`) VALUES
(3, 'Đỗ Thủy Tiên đã thích bài viết của bạn.', 1, NOW(6) - INTERVAL 1 DAY),
(3, 'Đỗ Thủy Tiên đã bình luận về bài viết của bạn.', 0, NOW(6) - INTERVAL 40 HOUR),
(5, 'Hoàng Hải Nam đã gửi cho bạn một yêu cầu trao đổi sách.', 0, NOW(6) - INTERVAL 1 DAY);