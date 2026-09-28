# Bookigma — Frontend (bản demo MVP)

Bookigma là nền tảng web gộp bốn thứ vào một chỗ: mạng xã hội cho người đọc sách,
sàn thương mại sách chính hãng, sàn trao đổi sách cũ, và trình đọc sách có trợ lý AI.

Đây là **bản demo chỉ chạy frontend**. Chưa có backend: toàn bộ dữ liệu nằm trong
`src/data/seed.js` và được lưu xuống `localStorage` của trình duyệt, nên mọi thao tác
(đặt hàng, nhắn tin, đọc sách, duyệt báo cáo…) đều có thật và **vẫn còn nguyên sau khi tải lại trang**.

## Chạy dự án

```bash
cd frontend
npm install
npm run dev      # mở http://localhost:5173
```

Lệnh khác: `npm run build` (đóng gói production), `npm run lint` (kiểm tra mã nguồn).

## Đăng nhập để demo

Trang `/login` có sẵn ba nút bấm-một-phát cho từng vai trò. Mật khẩu chung là `123456`.

| Vai trò | Email | Vào được những gì |
| --- | --- | --- |
| Độc giả | `user@bookigma.vn` | Bảng tin, mua sách, đọc sách, trao đổi, chat, gợi ý AI |
| Chủ shop | `shop@bookigma.vn` | Kênh người bán: sản phẩm, đơn hàng, doanh thu |
| Quản trị viên | `admin@bookigma.vn` | Dashboard, người dùng, kiểm duyệt, báo cáo vi phạm |

Muốn quay lại dữ liệu gốc: menu avatar → **Đặt lại dữ liệu demo**.

## Các chức năng đã hoàn thiện

**Mạng xã hội** — đăng bài (gắn kèm sách hoặc ảnh), thích, bình luận, lưu bài, báo cáo bài viết.

**Mua sách** — danh mục có lọc theo thể loại / khoảng giá / nhà bán và 5 kiểu sắp xếp,
gợi ý tìm kiếm ngay trên thanh điều hướng, trang chi tiết sản phẩm, giỏ hàng nhóm theo shop.

**Thanh toán** — nhập địa chỉ (có kiểm tra số điện thoại), ba phương thức (COD / chuyển khoản / MoMo),
ba loại mã giảm giá (theo %, theo số tiền, miễn phí ship) với điều kiện đơn tối thiểu.
Đặt hàng xong sẽ trừ tồn kho và cộng lượt bán thật.

**Quản lý đơn hàng** — phía người mua: lọc theo 7 trạng thái, tra cứu theo mã đơn/tên sách,
xem tiến trình giao hàng, hủy đơn, xác nhận đã nhận hàng.
Phía shop: xác nhận → bàn giao vận chuyển → đánh dấu đã giao, mỗi bước đều bắn thông báo cho khách.

**Kênh chủ shop** — bốn tab: tổng quan (biểu đồ doanh thu 14 ngày, doanh thu theo sản phẩm,
lượt bán theo thể loại, cảnh báo sắp hết hàng), quản lý sản phẩm (thêm/sửa/xóa), xử lý đơn, báo cáo doanh thu.

**Dashboard quản trị** — GMV, doanh thu Blind Book và hoa hồng P2P, biểu đồ doanh thu toàn sàn, đơn theo trạng thái,
doanh thu theo đối tác; quản lý người dùng (khóa/mở khóa), duyệt và gỡ sản phẩm, ẩn/xóa bài đăng, bảng đơn hàng.

**Báo cáo vi phạm** — báo cáo được bài đăng, sản phẩm, người dùng và tin trao đổi với 7 nhóm lý do.
Báo cáo chạy thẳng vào hàng chờ của admin; admin có thể áp dụng hình phạt (ẩn bài / khóa tài khoản / gỡ sản phẩm),
ghi kết luận xử lý, và người báo cáo nhận được thông báo phản hồi.

**Chat** — danh sách hội thoại có tìm kiếm và đếm tin chưa đọc, khung chat với biểu tượng cảm xúc,
hiệu ứng "đang gõ" và trả lời tự động. Chat mở được từ trang sản phẩm, trang đơn hàng và sàn trao đổi.

**Tiến trình đọc** — trình đọc lưu đúng chương và đoạn văn bạn đang đọc, tính phần trăm hoàn thành,
cộng dồn thời gian đọc. Có mục lục, đổi cỡ chữ, đọc thành tiếng, đánh dấu trang, Pomodoro và nhạc nền.
Trang **Tủ sách** tổng hợp lại toàn bộ, bảng tin có mục "Đọc tiếp".

**Gamification** — điểm Gigma tích từ hành vi thật (đọc 1 phút +2, xong chương +30, xong sách +200,
đăng bài +15, đặt hàng +50, giữ chuỗi mỗi ngày +25), cấp độ người đọc, 4 nhiệm vụ hằng ngày tự đặt lại
lúc nửa đêm, chuỗi ngày đọc, 10 huy hiệu tính từ dữ liệu thật, thú ảo tiến hoá qua 6 giai đoạn bằng chính
thời gian đọc của bạn, và cửa hàng đổi điểm lấy voucher hoặc quà thật.

**Blind Book** — hộp sách bí ẩn 3 mức giá 80k/150k/250k. Chọn tâm trạng, hệ thống ghép một cuốn có thật
trong kho theo thể loại, từ khoá và khoảng giá, loại bỏ sách bạn đã đọc hoặc đã mua. Hộp chỉ hiện manh mối;
tên sách lộ ra khi đơn đã giao và bạn bấm "Mở hộp" ở trang chi tiết đơn.

**Gợi ý bằng AI** — xem phần dưới.

**Khác** — giao diện sáng/tối có ghi nhớ, thông báo, bảng xếp hạng (sách / độc giả / khách thân thiết),
trang cá nhân, responsive tới cỡ điện thoại (màn hình nhỏ có thanh điều hướng riêng ở đáy).

## Mô hình doanh thu trong bản demo

Khớp với báo cáo dự án: Bookigma **chỉ thu hoa hồng 2–5% trên giao dịch sách cũ P2P**, không thu trên
đơn sách mới của nhà xuất bản. Doanh thu còn lại đến từ bán hộp Blind Book, gói Premium và quảng cáo B2B.
Bảng điều khiển quản trị hiển thị đúng các dòng doanh thu này.

## Bộ máy gợi ý hoạt động thế nào

Nằm ở [`src/lib/recommend.js`](src/lib/recommend.js). Đây là mô hình *content-based filtering*
chạy hoàn toàn ở trình duyệt, **không phải danh sách cứng**:

1. Dựng hồ sơ khẩu vị từ hành vi thật trong app — tiến trình đọc, đơn đã mua, sách trong giỏ,
   bài viết đã thích. Mỗi tín hiệu có trọng số khác nhau (đọc xong > đã mua > đang đọc > thích).
2. Cộng điểm cho thể loại, tác giả và từ khóa chủ đề của từng cuốn đã tương tác.
3. Chấm điểm mọi cuốn chưa tương tác theo độ khớp, cộng thêm điểm chất lượng và độ phổ biến.
4. Trả về danh sách xếp hạng kèm **lý do giải thích được** ("Cùng thể loại với cuốn X bạn đã đọc xong")
   — thứ mà hệ gợi ý hộp đen không làm được.

Vì chấm điểm dựa trên dữ liệu thật nên **đọc thêm một cuốn hoặc mua thêm một đơn là gợi ý đổi ngay**.
Trợ lý hỏi đáp bên cạnh cũng dùng chung kho dữ liệu đó, nên câu trả lời luôn khớp với sách đang bán.

## Cấu trúc thư mục

```
src/
  data/seed.js        Dữ liệu mẫu: người dùng, shop, sách (kèm nội dung đọc), đơn, báo cáo, hội thoại
  lib/
    recommend.js      Bộ máy gợi ý + trợ lý hỏi đáp
    gamification.js   Điểm Gigma, cấp độ, nhiệm vụ, huy hiệu, thú ảo, phần thưởng
    blindbook.js      Mức hộp, tâm trạng, thuật toán ghép sách bí ẩn
    format.js         Định dạng tiền tệ, thời gian, nhãn trạng thái
    storage.js        Lớp bọc localStorage
  context/            AppProvider (kho dữ liệu), AuthProvider, ThemeProvider, ToastProvider
  hooks/useStore.js   useApp / useAuth / useTheme / useToast
  components/         layout (Navbar), common (Modal, ReportModal, Field, ...), book (BookCard)
  pages/              Các trang, admin/ và shop/ là hai khu quản trị
```

## Khi nối backend cần sửa gì

`src/context/AppProvider.jsx` là chỗ duy nhất đọc/ghi dữ liệu. Các trang chỉ gọi hàm qua
`useApp()` và không biết dữ liệu đến từ đâu, nên chỉ cần thay phần thân của các hàm trong
AppProvider bằng lời gọi API là xong — **giao diện gần như không phải sửa**.
Tương tự, `getRecommendations` trong `lib/recommend.js` có thể thay bằng một lời gọi API duy nhất.

## Giới hạn của bản demo

Những điểm này là cố ý, cần backend mới làm thật được:

- Dữ liệu nằm trong `localStorage` của từng trình duyệt — hai máy khác nhau không thấy dữ liệu của nhau.
- Đăng nhập là giả lập, mật khẩu để dạng chữ thường trong `seed.js`, chưa có mã hóa hay phiên đăng nhập.
- Tin nhắn trả lời tự động bằng câu mẫu, chưa phải chat thời gian thực.
- Thanh toán chỉ mô phỏng, chưa nối cổng thanh toán thật.
- Ảnh bìa sách lấy từ Unsplash nên cần có mạng.

## Còn thiếu so với báo cáo dự án

Những phần sau đã có trong FINAL REPORT nhưng chưa làm trong MVP, xếp theo thứ tự nên làm tiếp:

- Gói Premium / Freemium 30.000–50.000đ/tháng.
- Bản đồ vị trí và cơ chế bảo đảm giao dịch cho sàn P2P.
- Bình luận ngay trong từng chương sách kèm bộ lọc chống spoiler.
- Câu lạc bộ sách ảo và thử thách đọc theo đợt.
- Bảng quảng cáo tự phục vụ cho nhà xuất bản (B2B) và gói bán cho trường học.

Xem `docs/MVP-section.md` để có bản thảo mục "Prototype/MVP" chèn vào báo cáo, kèm danh sách các đoạn
trong báo cáo cần sửa lại do nhóm đã chuyển từ ứng dụng di động sang nền tảng web.
