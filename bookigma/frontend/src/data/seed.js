/**
 * Dữ liệu khởi tạo cho bản demo Bookigma.
 * Toàn bộ dữ liệu được nạp vào localStorage ở lần chạy đầu tiên (xem lib/storage.js),
 * sau đó mọi thao tác của người dùng đều ghi đè lên bản lưu đó.
 */

const IMG = {
  alchemist: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
  thinking: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80',
  dacnhantam: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',
  matbiec: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&q=80',
  camngot: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400&q=80',
  sapiens: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80',
  atomic: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80',
  muonkiepnhansinh: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80',
  tuoitre: 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400&q=80',
  toiloi: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&q=80',
  ai: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&q=80',
  demen: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&q=80',
};

export const CATEGORIES = [
  'Truyền cảm hứng',
  'Tâm lý - Kỹ năng',
  'Văn học Việt Nam',
  'Văn học nước ngoài',
  'Khoa học - Công nghệ',
  'Kinh tế',
  'Thiếu nhi',
];

export const users = [
  {
    id: 'u1', name: 'Trần Đức Anh', email: 'user@bookigma.vn', password: '123456',
    avatar: 'https://i.pravatar.cc/150?img=12', role: 'user', status: 'active',
    joinedAt: '2026-01-14', points: 1280, badge: 'Mọt Sách Bạc', booksRead: 24,
    bio: 'Sinh viên năm 3, thích sách kỹ năng và truyền cảm hứng.',
    streak: 4, petXp: 540, petName: 'Mọt Bơ', petLastFed: Date.now() - 3 * 3600 * 1000,
  },
  {
    id: 'u2', name: 'Nguyễn Hoàng Nam', email: 'nam@bookigma.vn', password: '123456',
    avatar: 'https://i.pravatar.cc/150?img=33', role: 'user', status: 'active',
    joinedAt: '2026-02-02', points: 940, badge: 'Độc Giả Uy Tín', booksRead: 18, bio: 'Mê văn học Việt Nam.',
    streak: 2, petXp: 310, petName: 'Sún', petLastFed: Date.now() - 20 * 3600 * 1000,
  },
  {
    id: 'u3', name: 'Lê Thảo', email: 'thao@bookigma.vn', password: '123456',
    avatar: 'https://i.pravatar.cc/150?img=47', role: 'user', status: 'active',
    joinedAt: '2026-02-20', points: 2150, badge: 'Mọt Sách Vàng', booksRead: 41, bio: 'Review sách mỗi tuần.',
    streak: 11, petXp: 1950, petName: 'Cáo Giấy', petLastFed: Date.now() - 2 * 3600 * 1000,
  },
  {
    id: 'u4', name: 'Phạm Minh Đức', email: 'duc@bookigma.vn', password: '123456',
    avatar: 'https://i.pravatar.cc/150?img=11', role: 'user', status: 'suspended',
    joinedAt: '2026-03-05', points: 120, badge: 'Thành viên mới', booksRead: 3, bio: '',
  },
  {
    id: 'u5', name: 'Vũ Lan Anh', email: 'lananh@bookigma.vn', password: '123456',
    avatar: 'https://i.pravatar.cc/150?img=45', role: 'user', status: 'active',
    joinedAt: '2026-03-18', points: 610, badge: 'Thành viên', booksRead: 11, bio: 'Thích sách thiếu nhi.',
  },
  {
    id: 's1', name: 'Fahasa Official', email: 'shop@bookigma.vn', password: '123456',
    avatar: 'https://i.pravatar.cc/150?img=68', role: 'shop', shopId: 'sh1', status: 'active',
    joinedAt: '2025-11-01', points: 0, badge: 'Đối tác', booksRead: 0, bio: 'Nhà sách chính hãng.',
  },
  {
    id: 's2', name: 'NXB Trẻ', email: 'nxbtre@bookigma.vn', password: '123456',
    avatar: 'https://i.pravatar.cc/150?img=3', role: 'shop', shopId: 'sh2', status: 'active',
    joinedAt: '2025-12-10', points: 0, badge: 'Đối tác', booksRead: 0, bio: 'Nhà xuất bản Trẻ.',
  },
  {
    id: 'a1', name: 'Quản trị viên', email: 'admin@bookigma.vn', password: '123456',
    avatar: 'https://i.pravatar.cc/150?img=59', role: 'admin', status: 'active',
    joinedAt: '2025-10-01', points: 0, badge: 'Admin', booksRead: 0, bio: '',
  },
];

export const shops = [
  {
    id: 'sh1', name: 'Fahasa Official', ownerId: 's1', avatar: 'https://i.pravatar.cc/150?img=68',
    rating: 4.8, followers: 12400, verified: true, joinedAt: '2025-11-01',
    description: 'Nhà sách Fahasa — sách chính hãng, giao hàng toàn quốc.',
  },
  {
    id: 'sh2', name: 'NXB Trẻ', ownerId: 's2', avatar: 'https://i.pravatar.cc/150?img=3',
    rating: 4.9, followers: 8600, verified: true, joinedAt: '2025-12-10',
    description: 'Nhà xuất bản Trẻ — kho sách văn học và thiếu nhi.',
  },
];

/** Nội dung sách mẫu dùng cho trình đọc. */
const chapter = (title, paragraphs) => ({ title, paragraphs });

export const books = [
  {
    id: 'b1', title: 'Nhà Giả Kim', author: 'Paulo Coelho', cover: IMG.alchemist,
    price: 79000, originalPrice: 99000, shopId: 'sh1', category: 'Truyền cảm hứng',
    rating: 4.9, ratingCount: 2418, sold: 5120, stock: 148, status: 'active', pages: 228,
    description: 'Câu chuyện về cậu bé chăn cừu Santiago đi tìm kho báu và khám phá ra vận mệnh của chính mình. Một trong những cuốn sách truyền cảm hứng được đọc nhiều nhất thế giới.',
    tags: ['triết lý', 'hành trình', 'ước mơ', 'tâm linh'],
    chapters: [
      chapter('Chương 1: Tiếng gọi từ vũ trụ', [
        'Cậu tên là Santiago. Trời đã chập tối khi cậu cùng đàn cừu đến một nhà thờ cổ sụp đổ, mái đã sập từ lâu và một cây chăn lớn đã mọc lên ngay nơi xưa là phòng thánh.',
        'Cậu quyết định ngủ lại đấy qua đêm. Cậu lùa đống cừu qua cánh cổng hỏng rồi chắn ngang bằng vài thanh gỗ để chúng khỏi đi lang thang lúc đêm tối. Tuy vùng này không có dã thú nhưng đã có lần một con cừu xổng ra khiến cậu phải mất cả ngày hôm sau đi tìm.',
        'Cậu trải áo khoác xuống nền nhà rồi nằm lên, lấy quyển sách vừa đọc xong làm gối. Trước khi thiếp đi, cậu tự nhủ rằng từ nay nên đọc sách dày hơn: vừa lâu hết vừa làm gối êm hơn.',
        'Khi cậu thức giấc thì trời hãy còn tối. Nhìn lên, cậu thấy các vì sao lấp lánh qua mái nhà thủng. Mình còn muốn ngủ thêm chút nữa, cậu nghĩ. Cậu vừa mơ đúng giấc mơ tuần trước và lại tỉnh dậy trước khi giấc mơ chấm dứt.',
      ]),
      chapter('Chương 2: Ông vua già xứ Salem', [
        'Ông già mặc áo choàng ngồi xuống cạnh cậu. Ông nói rằng ông là Melchizedek, vua xứ Salem, và ông đến để nói với cậu về vận mệnh của cậu.',
        '"Vận mệnh là điều mà con hằng mong muốn thực hiện," ông nói. "Ai cũng biết được vận mệnh của mình khi còn trẻ. Vào giai đoạn ấy trong đời, mọi thứ đều rõ ràng, mọi thứ đều có thể."',
        'Cậu bé nghe mà thấy lòng mình rung động. Trong túi áo, hai viên đá Urim và Thummim nằm im lặng, chờ đợi những câu hỏi mà cậu chưa dám đặt ra.',
        '"Khi con thật sự mong muốn điều gì, cả vũ trụ sẽ chung sức giúp con đạt được điều ấy," ông vua nói, rồi biến mất vào ánh nắng ban trưa.',
      ]),
      chapter('Chương 3: Sa mạc và bài học của gió', [
        'Đoàn lữ hành đi vào sa mạc. Cát trải dài đến tận chân trời, và mỗi ngày Santiago lại học được một điều mới từ sự im lặng mênh mông ấy.',
        'Người luyện kim đan nói: "Sa mạc sẽ dạy con tất cả, nhưng nó đòi hỏi con phải lắng nghe. Con phải học ngôn ngữ mà mọi vật trên đời đều nói chung — thứ ngôn ngữ của nhiệt tâm."',
        'Santiago hiểu ra rằng kho báu cậu tìm kiếm không nằm ở nơi cậu nghĩ. Nhưng hành trình đi tìm nó mới là thứ thay đổi cậu mãi mãi.',
      ]),
    ],
  },
  {
    id: 'b2', title: 'Tư Duy Nhanh Và Chậm', author: 'Daniel Kahneman', cover: IMG.thinking,
    price: 145000, originalPrice: 189000, shopId: 'sh2', category: 'Tâm lý - Kỹ năng',
    rating: 4.8, ratingCount: 1180, sold: 2340, stock: 62, status: 'active', pages: 542,
    description: 'Giải Nobel Kinh tế Daniel Kahneman giải thích hai hệ thống chi phối cách chúng ta suy nghĩ: Hệ thống 1 nhanh và cảm tính, Hệ thống 2 chậm và lý trí.',
    tags: ['tâm lý học', 'ra quyết định', 'hành vi', 'khoa học'],
    chapters: [
      chapter('Chương 1: Hai hệ thống', [
        'Hệ thống 1 hoạt động tự động và nhanh chóng, hầu như không cần nỗ lực và không có cảm giác về sự kiểm soát có chủ ý.',
        'Hệ thống 2 phân bổ sự chú ý cho các hoạt động tinh thần đòi hỏi nỗ lực, bao gồm cả những phép tính phức tạp. Hoạt động của Hệ thống 2 thường gắn với trải nghiệm chủ quan về hành động, lựa chọn và sự tập trung.',
        'Khi chúng ta nghĩ về bản thân mình, ta đồng nhất với Hệ thống 2 — cái tôi có ý thức, biết suy luận, có niềm tin. Nhưng phần lớn quyết định trong ngày lại do Hệ thống 1 âm thầm đưa ra.',
      ]),
      chapter('Chương 2: Sự chú ý và nỗ lực', [
        'Hệ thống 2 có khả năng hạn chế. Khi bạn đang bận rộn với một việc đòi hỏi nỗ lực, bạn gần như mù trước những gì đang xảy ra xung quanh.',
        'Thí nghiệm "con khỉ vô hình" cho thấy khi tập trung đếm số lần chuyền bóng, một nửa số người xem hoàn toàn không nhìn thấy người mặc đồ khỉ đi ngang qua màn hình.',
      ]),
    ],
  },
  {
    id: 'b3', title: 'Đắc Nhân Tâm', author: 'Dale Carnegie', cover: IMG.dacnhantam,
    price: 89000, originalPrice: 110000, shopId: 'sh1', category: 'Tâm lý - Kỹ năng',
    rating: 4.7, ratingCount: 3902, sold: 8800, stock: 320, status: 'active', pages: 320,
    description: 'Cuốn sách kinh điển về nghệ thuật giao tiếp và ứng xử, giúp bạn xây dựng mối quan hệ bền vững trong công việc và cuộc sống.',
    tags: ['giao tiếp', 'kỹ năng mềm', 'quan hệ'],
    chapters: [
      chapter('Chương 1: Muốn lấy mật đừng phá tổ ong', [
        'Ngày 7 tháng 5 năm 1931, thành phố New York chứng kiến cuộc vây bắt tội phạm gay cấn nhất trong lịch sử. "Hai Khẩu Súng" Crowley bị bao vây trên căn hộ ở đại lộ West End.',
        'Điều đáng ngạc nhiên là trong lá thư viết lúc bị vây, Crowley tự nhận mình có "một trái tim mệt mỏi, nhưng nhân hậu — trái tim không bao giờ làm hại ai". Kẻ sát nhân này không hề tự trách mình.',
        'Bài học: chỉ trích là vô ích, bởi nó khiến người ta phải phòng thủ và thường làm họ cố sức biện minh cho mình.',
      ]),
    ],
  },
  {
    id: 'b4', title: 'Mắt Biếc', author: 'Nguyễn Nhật Ánh', cover: IMG.matbiec,
    price: 95000, originalPrice: 120000, shopId: 'sh2', category: 'Văn học Việt Nam',
    rating: 4.9, ratingCount: 2760, sold: 6400, stock: 95, status: 'active', pages: 268,
    description: 'Câu chuyện tình đơn phương day dứt của Ngạn dành cho Hà Lan, trải dài từ làng Đo Đo tới thành phố.',
    tags: ['tình yêu', 'tuổi thơ', 'làng quê', 'buồn'],
    chapters: [
      chapter('Chương 1: Làng Đo Đo', [
        'Tôi sinh ra ở làng Đo Đo. Làng tôi nhỏ, nhỏ đến mức chỉ cần đứng ở đầu làng gọi to một tiếng là cuối làng đã nghe.',
        'Hà Lan có đôi mắt rất đẹp. Mắt to, tròn và đen láy. Nhưng cái đẹp của đôi mắt ấy không nằm ở hình dáng mà nằm ở cái nhìn — một cái nhìn khiến người ta thấy mình vừa được che chở vừa bị bỏ rơi.',
      ]),
    ],
  },
  {
    id: 'b5', title: 'Sapiens: Lược Sử Loài Người', author: 'Yuval Noah Harari', cover: IMG.sapiens,
    price: 199000, originalPrice: 259000, shopId: 'sh1', category: 'Khoa học - Công nghệ',
    rating: 4.8, ratingCount: 1540, sold: 3100, stock: 48, status: 'active', pages: 554,
    description: 'Hành trình 70.000 năm của loài Homo sapiens, từ những bầy người săn bắt hái lượm đến chủ nhân của hành tinh.',
    tags: ['lịch sử', 'tiến hóa', 'xã hội', 'khoa học'],
    chapters: [
      chapter('Chương 1: Một loài vật chẳng có gì đặc biệt', [
        'Khoảng 13,5 tỷ năm trước, vật chất, năng lượng, thời gian và không gian ra đời trong sự kiện gọi là Vụ Nổ Lớn.',
        'Homo sapiens xuất hiện ở Đông Phi khoảng 200.000 năm trước. Trong phần lớn lịch sử, chúng ta là một loài vật tầm thường, đứng giữa chuỗi thức ăn.',
      ]),
    ],
  },
  {
    id: 'b6', title: 'Atomic Habits - Thay Đổi Tí Hon', author: 'James Clear', cover: IMG.atomic,
    price: 139000, originalPrice: 169000, shopId: 'sh1', category: 'Tâm lý - Kỹ năng',
    rating: 4.9, ratingCount: 2210, sold: 4500, stock: 210, status: 'active', pages: 320,
    description: 'Phương pháp đã được chứng minh để xây dựng thói quen tốt và loại bỏ thói quen xấu bằng những thay đổi 1% mỗi ngày.',
    tags: ['thói quen', 'năng suất', 'phát triển bản thân'],
    chapters: [
      chapter('Chương 1: Sức mạnh đáng kinh ngạc của thói quen nguyên tử', [
        'Nếu bạn tốt hơn 1% mỗi ngày trong một năm, cuối cùng bạn sẽ tốt hơn 37 lần. Ngược lại, nếu tệ đi 1% mỗi ngày, bạn gần như trở về con số 0.',
        'Thói quen là lãi kép của sự tự cải thiện. Chúng có vẻ nhỏ bé và vô nghĩa ở thời điểm hiện tại, nhưng qua nhiều tháng năm chúng tạo ra khác biệt khổng lồ.',
      ]),
    ],
  },
  {
    id: 'b7', title: 'Muôn Kiếp Nhân Sinh', author: 'Nguyên Phong', cover: IMG.muonkiepnhansinh,
    price: 129000, originalPrice: 158000, shopId: 'sh2', category: 'Truyền cảm hứng',
    rating: 4.7, ratingCount: 1890, sold: 3900, stock: 76, status: 'active', pages: 398,
    description: 'Những câu chuyện về luân hồi, nhân quả và ý nghĩa sâu xa của kiếp người qua lời kể của Thomas.',
    tags: ['tâm linh', 'triết lý', 'nhân quả', 'hành trình'],
    chapters: [
      chapter('Chương 1: Cuộc gặp gỡ định mệnh', [
        'Thomas là một nhà tài chính thành đạt ở New York. Nhưng đằng sau sự thành công ấy là những giấc mơ lặp đi lặp lại về một kiếp sống khác, ở một vùng đất khác.',
        'Ông kể: "Tôi thấy mình đứng giữa đền Karnak, mặc áo tu sĩ, và biết rõ từng viên đá ở đó — dù đời này tôi chưa từng đặt chân đến Ai Cập."',
      ]),
    ],
  },
  {
    id: 'b8', title: 'Tuổi Trẻ Đáng Giá Bao Nhiêu', author: 'Rosie Nguyễn', cover: IMG.tuoitre,
    price: 75000, originalPrice: 90000, shopId: 'sh2', category: 'Truyền cảm hứng',
    rating: 4.5, ratingCount: 1420, sold: 2800, stock: 130, status: 'active', pages: 285,
    description: 'Cuốn sách gối đầu giường của người trẻ Việt về học, làm và đi.',
    tags: ['tuổi trẻ', 'phát triển bản thân', 'du lịch'],
    chapters: [
      chapter('Chương 1: Học', [
        'Tôi tin rằng thứ tài sản lớn nhất của tuổi trẻ không phải là thời gian, mà là khả năng học hỏi nhanh hơn bất kỳ giai đoạn nào khác của đời người.',
        'Mỗi cuốn sách bạn đọc là một cuộc đối thoại với người thông minh nhất trong lĩnh vực đó, với giá rẻ hơn một bữa ăn.',
      ]),
    ],
  },
  {
    id: 'b9', title: 'Tội Ác Và Hình Phạt', author: 'Fyodor Dostoevsky', cover: IMG.toiloi,
    price: 165000, originalPrice: 199000, shopId: 'sh1', category: 'Văn học nước ngoài',
    rating: 4.6, ratingCount: 880, sold: 1200, stock: 34, status: 'active', pages: 671,
    description: 'Kiệt tác tâm lý về tội lỗi, sự dằn vặt và con đường cứu chuộc của Raskolnikov.',
    tags: ['kinh điển', 'tâm lý', 'triết lý', 'Nga'],
    chapters: [
      chapter('Chương 1: Căn gác xép', [
        'Vào một buổi chiều nóng nực đầu tháng Bảy, một chàng trai trẻ bước ra khỏi căn gác xép thuê lại ở ngõ S., chậm rãi và như còn lưỡng lự, đi về phía cầu K.',
        'Chàng đã mắc nợ bà chủ nhà và sợ gặp bà ta. Không phải vì chàng nhút nhát — mà vì từ lâu chàng đã rơi vào trạng thái căng thẳng và cáu bẳn giống như chứng nghi bệnh.',
      ]),
    ],
  },
  {
    id: 'b10', title: 'AI Và Tương Lai Loài Người', author: 'Kai-Fu Lee', cover: IMG.ai,
    price: 189000, originalPrice: 229000, shopId: 'sh1', category: 'Khoa học - Công nghệ',
    rating: 4.6, ratingCount: 640, sold: 980, stock: 55, status: 'pending', pages: 412,
    description: 'Cuộc đua AI giữa Mỹ và Trung Quốc và những gì nó có nghĩa với công việc, xã hội và ý nghĩa cuộc sống.',
    tags: ['công nghệ', 'AI', 'tương lai', 'kinh tế'],
    chapters: [
      chapter('Chương 1: Khoảnh khắc Sputnik của Trung Quốc', [
        'Tháng 5 năm 2017, AlphaGo đánh bại Kha Khiết — kỳ thủ cờ vây số một thế giới. Với phương Tây đó là một tin công nghệ. Với Trung Quốc, đó là khoảnh khắc Sputnik.',
      ]),
    ],
  },
  {
    id: 'b11', title: 'Dế Mèn Phiêu Lưu Ký', author: 'Tô Hoài', cover: IMG.demen,
    price: 58000, originalPrice: 72000, shopId: 'sh2', category: 'Thiếu nhi',
    rating: 4.8, ratingCount: 1980, sold: 5600, stock: 240, status: 'active', pages: 168,
    description: 'Cuộc phiêu lưu kinh điển của chú Dế Mèn, tác phẩm thiếu nhi được yêu thích nhất Việt Nam.',
    tags: ['thiếu nhi', 'phiêu lưu', 'kinh điển', 'Việt Nam'],
    chapters: [
      chapter('Chương 1: Tôi sống độc lập từ thuở bé', [
        'Tôi sống độc lập từ thuở bé. Ấy là tục lệ lâu đời trong họ nhà dế chúng tôi. Vả lại, mẹ thường bảo chúng tôi rằng: "Phải như thế để các con biết kiếm ăn một mình cho quen đi."',
      ]),
    ],
  },
  {
    id: 'b12', title: 'Cây Cam Ngọt Của Tôi', author: 'José Mauro de Vasconcelos', cover: IMG.camngot,
    price: 108000, originalPrice: 128000, shopId: 'sh2', category: 'Văn học nước ngoài',
    rating: 4.9, ratingCount: 3100, sold: 7200, stock: 88, status: 'active', pages: 244,
    description: 'Câu chuyện cảm động về cậu bé Zezé và cây cam ngọt — người bạn tưởng tượng của em.',
    tags: ['tuổi thơ', 'cảm động', 'gia đình', 'buồn'],
    chapters: [
      chapter('Chương 1: Người khám phá ra mọi thứ', [
        'Chúng tôi nắm tay nhau đi dọc phố. Totoca chẳng vội gì. Anh dạy tôi biết cuộc sống là thế nào. Và điều đó khiến tôi rất hài lòng, vì anh tôi là người khám phá ra mọi thứ.',
      ]),
    ],
  },
];

export const posts = [
  {
    id: 'p1', authorId: 'u1', time: Date.now() - 2 * 3600 * 1000,
    content: "Vừa đọc xong cuốn 'Nhà Giả Kim'. Thực sự rất truyền cảm hứng về hành trình đuổi theo ước mơ. Có ai muốn trao đổi cuốn này lấy 'Tội Ác Và Hình Phạt' không?",
    image: IMG.alchemist, bookId: 'b1', likedBy: ['u2', 'u3'], hidden: false,
    comments: [
      { id: 'c1', authorId: 'u3', text: 'Mình cũng vừa đọc xong, chương cuối hay thật sự!', time: Date.now() - 1.5 * 3600 * 1000 },
      { id: 'c2', authorId: 'u2', text: 'Inbox mình nhé, mình có cuốn Tội Ác Và Hình Phạt bản mới.', time: Date.now() - 3600 * 1000 },
    ],
  },
  {
    id: 'p2', authorId: 's2', time: Date.now() - 5 * 3600 * 1000,
    content: '🔥 SÁCH MỚI LÊN SÀN! "Cây Cam Ngọt Của Tôi" bản bìa cứng đã có mặt tại Bookigma Shop với ưu đãi 20% trong tuần này.',
    image: IMG.camngot, bookId: 'b12', likedBy: ['u1', 'u2', 'u3', 'u5'], hidden: false,
    comments: [{ id: 'c3', authorId: 'u5', text: 'Đặt ngay 2 cuốn ạ!', time: Date.now() - 4 * 3600 * 1000 }],
  },
  {
    id: 'p3', authorId: 'u3', time: Date.now() - 26 * 3600 * 1000,
    content: 'Review nhanh "Atomic Habits": 4 quy luật thay đổi hành vi thực sự áp dụng được. Mình đã duy trì đọc 20 trang/ngày suốt 3 tháng nhờ quy tắc "làm cho nó dễ dàng". 9/10.',
    image: IMG.atomic, bookId: 'b6', likedBy: ['u1', 'u5'], hidden: false, comments: [],
  },
  {
    id: 'p4', authorId: 'u4', time: Date.now() - 30 * 3600 * 1000,
    content: 'BÁN SÁCH LẬU GIÁ RẺ, PHOTO NÉT CĂNG, INBOX SỐ ZALO 09xxxxx ĐỂ ĐẶT HÀNG SỈ!!!',
    image: null, bookId: null, likedBy: [], hidden: false, comments: [],
  },
];

export const exchanges = [
  {
    id: 'e1', bookTitle: 'Mắt Biếc', ownerId: 'u2', wanted: 'Dế Mèn Phiêu Lưu Ký',
    condition: 'Mới 95%', location: 'Hà Nội', cover: IMG.matbiec, status: 'open',
    note: 'Sách đọc 1 lần, không gấp trang, bọc bìa kính.',
  },
  {
    id: 'e2', bookTitle: 'Tuổi Trẻ Đáng Giá Bao Nhiêu', ownerId: 'u5', wanted: 'Sách kỹ năng mềm bất kỳ',
    condition: 'Mới 90%', location: 'TP.HCM', cover: IMG.tuoitre, status: 'open',
    note: 'Có vài dòng highlight bằng bút nhớ.',
  },
  {
    id: 'e3', bookTitle: 'Sapiens: Lược Sử Loài Người', ownerId: 'u3', wanted: 'Tư Duy Nhanh Và Chậm',
    condition: 'Mới 99%', location: 'Đà Nẵng', cover: IMG.sapiens, status: 'open',
    note: 'Bản bìa mềm, còn nguyên seal tem NXB.',
  },
];

export const vouchers = [
  { code: 'BOOKIGMA10', label: 'Giảm 10% tối đa 30.000đ', type: 'percent', value: 10, maxDiscount: 30000, minOrder: 100000 },
  { code: 'FREESHIP', label: 'Miễn phí vận chuyển', type: 'shipping', value: 0, minOrder: 150000 },
  { code: 'GIAM50K', label: 'Giảm 50.000đ cho đơn từ 300.000đ', type: 'amount', value: 50000, minOrder: 300000 },
];

const daysAgo = (d) => Date.now() - d * 24 * 3600 * 1000;

export const orders = [
  {
    id: 'o1', code: 'BKG240915', userId: 'u1', createdAt: daysAgo(12),
    items: [{ bookId: 'b3', title: 'Đắc Nhân Tâm', cover: IMG.dacnhantam, price: 89000, qty: 1, shopId: 'sh1' }],
    subtotal: 89000, shippingFee: 25000, discount: 0, total: 114000,
    address: { name: 'Trần Đức Anh', phone: '0901234567', detail: '12 Nguyễn Trãi, Thanh Xuân, Hà Nội' },
    payment: 'cod', status: 'completed',
    timeline: [
      { status: 'pending', at: daysAgo(12), note: 'Đơn hàng được tạo' },
      { status: 'confirmed', at: daysAgo(11.8), note: 'Shop xác nhận' },
      { status: 'shipping', at: daysAgo(11), note: 'Đang giao bởi GHTK' },
      { status: 'delivered', at: daysAgo(9), note: 'Giao thành công' },
      { status: 'completed', at: daysAgo(8), note: 'Khách xác nhận đã nhận hàng' },
    ],
  },
  {
    id: 'o2', code: 'BKG240920', userId: 'u1', createdAt: daysAgo(4),
    items: [
      { bookId: 'b6', title: 'Atomic Habits - Thay Đổi Tí Hon', cover: IMG.atomic, price: 139000, qty: 1, shopId: 'sh1' },
      { bookId: 'b1', title: 'Nhà Giả Kim', cover: IMG.alchemist, price: 79000, qty: 2, shopId: 'sh1' },
    ],
    subtotal: 297000, shippingFee: 25000, discount: 29700, total: 292300,
    address: { name: 'Trần Đức Anh', phone: '0901234567', detail: '12 Nguyễn Trãi, Thanh Xuân, Hà Nội' },
    payment: 'bank', status: 'shipping', voucher: 'BOOKIGMA10',
    timeline: [
      { status: 'pending', at: daysAgo(4), note: 'Đơn hàng được tạo' },
      { status: 'confirmed', at: daysAgo(3.6), note: 'Shop xác nhận' },
      { status: 'shipping', at: daysAgo(2), note: 'Đang giao bởi GHN' },
    ],
  },
  {
    id: 'o3', code: 'BKG240922', userId: 'u3', createdAt: daysAgo(2),
    items: [{ bookId: 'b12', title: 'Cây Cam Ngọt Của Tôi', cover: IMG.camngot, price: 108000, qty: 1, shopId: 'sh2' }],
    subtotal: 108000, shippingFee: 25000, discount: 0, total: 133000,
    address: { name: 'Lê Thảo', phone: '0912345678', detail: '45 Lê Lợi, Quận 1, TP.HCM' },
    payment: 'momo', status: 'pending',
    timeline: [{ status: 'pending', at: daysAgo(2), note: 'Đơn hàng được tạo' }],
  },
  {
    id: 'o4', code: 'BKG240918', userId: 'u5', createdAt: daysAgo(6),
    items: [{ bookId: 'b11', title: 'Dế Mèn Phiêu Lưu Ký', cover: IMG.demen, price: 58000, qty: 3, shopId: 'sh2' }],
    subtotal: 174000, shippingFee: 0, discount: 0, total: 174000,
    address: { name: 'Vũ Lan Anh', phone: '0987654321', detail: '88 Trần Phú, Hải Châu, Đà Nẵng' },
    payment: 'cod', status: 'confirmed', voucher: 'FREESHIP',
    timeline: [
      { status: 'pending', at: daysAgo(6), note: 'Đơn hàng được tạo' },
      { status: 'confirmed', at: daysAgo(5.5), note: 'Shop xác nhận' },
    ],
  },
  {
    id: 'o5', code: 'BKG240910', userId: 'u2', createdAt: daysAgo(15),
    items: [{ bookId: 'b5', title: 'Sapiens: Lược Sử Loài Người', cover: IMG.sapiens, price: 199000, qty: 1, shopId: 'sh1' }],
    subtotal: 199000, shippingFee: 25000, discount: 0, total: 224000,
    address: { name: 'Nguyễn Hoàng Nam', phone: '0933222111', detail: '7 Cầu Giấy, Hà Nội' },
    payment: 'cod', status: 'cancelled',
    timeline: [
      { status: 'pending', at: daysAgo(15), note: 'Đơn hàng được tạo' },
      { status: 'cancelled', at: daysAgo(14), note: 'Khách hủy: đặt nhầm số lượng' },
    ],
  },
];

/**
 * Hai đơn mua bán sách cũ giữa người dùng với nhau (P2P). Bookigma thu hoa hồng
 * 2-5% trên các đơn này — đây là dòng doanh thu duy nhất tính theo % giao dịch
 * trong mô hình kinh doanh của dự án.
 */
orders.push(
  {
    id: 'o7', code: 'BKG240919', userId: 'u5', createdAt: daysAgo(5), p2p: true, sellerId: 'u3',
    items: [{ bookId: 'b9', title: 'Tội Ác Và Hình Phạt (sách cũ, mới 90%)', cover: IMG.toiloi, price: 95000, qty: 1, shopId: 'sh1' }],
    subtotal: 95000, shippingFee: 25000, discount: 0, total: 120000,
    address: { name: 'Vũ Lan Anh', phone: '0987654321', detail: '88 Trần Phú, Hải Châu, Đà Nẵng' },
    payment: 'cod', status: 'completed',
    timeline: [
      { status: 'pending', at: daysAgo(5), note: 'Đơn trao đổi P2P được tạo' },
      { status: 'confirmed', at: daysAgo(4.7), note: 'Người bán xác nhận' },
      { status: 'shipping', at: daysAgo(4), note: 'Đang giao bởi GHTK' },
      { status: 'delivered', at: daysAgo(2), note: 'Giao thành công' },
      { status: 'completed', at: daysAgo(1.5), note: 'Người mua xác nhận, Bookigma giải ngân cho người bán' },
    ],
  },
  {
    id: 'o8', code: 'BKG240923', userId: 'u2', createdAt: daysAgo(1), p2p: true, sellerId: 'u1',
    items: [{ bookId: 'b8', title: 'Tuổi Trẻ Đáng Giá Bao Nhiêu (sách cũ, mới 95%)', cover: IMG.tuoitre, price: 45000, qty: 1, shopId: 'sh2' }],
    subtotal: 45000, shippingFee: 25000, discount: 0, total: 70000,
    address: { name: 'Nguyễn Hoàng Nam', phone: '0933222111', detail: '7 Cầu Giấy, Hà Nội' },
    payment: 'momo', status: 'shipping',
    timeline: [
      { status: 'pending', at: daysAgo(1), note: 'Đơn trao đổi P2P được tạo' },
      { status: 'confirmed', at: daysAgo(0.8), note: 'Người bán xác nhận' },
      { status: 'shipping', at: daysAgo(0.4), note: 'Đang giao bởi GHN' },
    ],
  }
);

/** Một đơn Blind Book đã giao, dùng để demo thao tác mở hộp ngay từ đầu. */
orders.push({
  id: 'o6', code: 'BKG240921', userId: 'u1', createdAt: daysAgo(3), p2p: false,
  items: [{
    bookId: 'b7', title: 'Hộp Blind Book — Cần động lực', cover: IMG.muonkiepnhansinh,
    price: 150000, qty: 1, shopId: 'sh2',
    blind: { moodId: 'motivation', moodLabel: 'Cần động lực', tierId: 'standard', tierName: 'Hộp Tiêu Chuẩn' },
    revealed: false,
  }],
  subtotal: 150000, shippingFee: 25000, discount: 0, total: 175000,
  address: { name: 'Trần Đức Anh', phone: '0901234567', detail: '12 Nguyễn Trãi, Thanh Xuân, Hà Nội' },
  payment: 'momo', status: 'delivered',
  timeline: [
    { status: 'pending', at: daysAgo(3), note: 'Đơn hàng được tạo' },
    { status: 'confirmed', at: daysAgo(2.8), note: 'Shop xác nhận' },
    { status: 'shipping', at: daysAgo(2), note: 'Đang giao bởi GHN' },
    { status: 'delivered', at: daysAgo(0.5), note: 'Giao thành công — bấm mở hộp để xem sách bên trong' },
  ],
});

export const reports = [
  {
    id: 'r1', type: 'post', targetId: 'p4', targetLabel: 'Bài đăng của Phạm Minh Đức',
    reporterId: 'u3', reason: 'Hàng giả / sách lậu',
    detail: 'Bài viết công khai rao bán sách photo, vi phạm bản quyền.',
    status: 'pending', createdAt: daysAgo(1), handledBy: null, handledNote: '',
  },
  {
    id: 'r2', type: 'user', targetId: 'u4', targetLabel: 'Phạm Minh Đức',
    reporterId: 'u2', reason: 'Spam / quảng cáo',
    detail: 'Liên tục nhắn tin quảng cáo vào hộp thư của nhiều người.',
    status: 'pending', createdAt: daysAgo(2), handledBy: null, handledNote: '',
  },
  {
    id: 'r3', type: 'book', targetId: 'b10', targetLabel: 'AI Và Tương Lai Loài Người',
    reporterId: 'u1', reason: 'Thông tin sai lệch',
    detail: 'Mô tả sản phẩm ghi sai tên dịch giả và năm xuất bản.',
    status: 'resolved', createdAt: daysAgo(8), handledBy: 'a1',
    handledNote: 'Đã yêu cầu shop cập nhật lại mô tả. Shop đã sửa.',
  },
];

export const conversations = [
  {
    id: 'cv1', participants: ['u1', 'u2'], updatedAt: Date.now() - 12 * 60 * 1000,
    messages: [
      { id: 'm1', senderId: 'u2', text: 'Chào bạn, mình thấy bài đăng muốn đổi Nhà Giả Kim đúng không?', at: Date.now() - 40 * 60 * 1000 },
      { id: 'm2', senderId: 'u1', text: 'Đúng rồi bạn. Bạn có cuốn Tội Ác Và Hình Phạt à?', at: Date.now() - 35 * 60 * 1000 },
      { id: 'm3', senderId: 'u2', text: 'Có nhé, bản NXB Văn Học, mới 95%. Mình gửi ảnh cho bạn xem.', at: Date.now() - 12 * 60 * 1000 },
    ],
    readBy: { u2: 3 },
  },
  {
    id: 'cv2', participants: ['u1', 'u3'], updatedAt: Date.now() - 3 * 3600 * 1000,
    messages: [
      { id: 'm4', senderId: 'u3', text: 'Ê, cuốn Atomic Habits bạn đọc tới đâu rồi?', at: Date.now() - 4 * 3600 * 1000 },
      { id: 'm5', senderId: 'u1', text: 'Mình đang ở chương 2, phần về quy luật "làm cho nó hiển nhiên".', at: Date.now() - 3.5 * 3600 * 1000 },
      { id: 'm6', senderId: 'u3', text: 'Chương 4 mới đỉnh, ráng đọc tới nhé 😄', at: Date.now() - 3 * 3600 * 1000 },
    ],
    readBy: { u1: 3, u3: 3 },
  },
  {
    id: 'cv3', participants: ['u1', 's1'], updatedAt: Date.now() - 22 * 3600 * 1000,
    messages: [
      { id: 'm7', senderId: 'u1', text: 'Shop ơi, đơn BKG240920 bao giờ giao ạ?', at: Date.now() - 23 * 3600 * 1000 },
      { id: 'm8', senderId: 's1', text: 'Dạ đơn của bạn đang trên đường giao, dự kiến 1-2 ngày nữa tới nơi ạ.', at: Date.now() - 22 * 3600 * 1000 },
    ],
    readBy: { u1: 2, s1: 2 },
  },
];

/** Tiến trình đọc của người dùng u1 — dùng để demo mục "Đang đọc" và gợi ý AI. */
export const readingProgress = {
  u1: {
    b1: { bookId: 'b1', chapterIndex: 2, paragraphIndex: 1, percent: 82, lastReadAt: daysAgo(1), secondsRead: 4820, finished: false },
    b6: { bookId: 'b6', chapterIndex: 1, paragraphIndex: 0, percent: 46, lastReadAt: daysAgo(3), secondsRead: 2100, finished: false },
    b3: { bookId: 'b3', chapterIndex: 0, paragraphIndex: 2, percent: 100, lastReadAt: daysAgo(20), secondsRead: 9600, finished: true },
    b12: { bookId: 'b12', chapterIndex: 0, paragraphIndex: 0, percent: 12, lastReadAt: daysAgo(6), secondsRead: 640, finished: false },
  },
};

export const redemptions = [];

export const notifications = [
  { id: 'n1', userId: 'u1', text: 'Lê Thảo đã bình luận vào bài viết của bạn.', at: Date.now() - 20 * 60 * 1000, read: false, link: '/' },
  { id: 'n2', userId: 'u1', text: 'Đơn hàng BKG240920 đang được giao.', at: Date.now() - 2 * 3600 * 1000, read: false, link: '/orders' },
  { id: 'n3', userId: 'u1', text: 'Nguyễn Hoàng Nam muốn trao đổi sách với bạn.', at: Date.now() - 26 * 3600 * 1000, read: true, link: '/exchange' },
];
