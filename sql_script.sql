DROP DATABASE IF EXISTS `Bookigma`;

-- 1. Tao database va chon database lam viec
CREATE DATABASE IF NOT EXISTS Bookigma CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE Bookigma;

-- Du lieu mau co dau tieng Viet: doc file theo utf8mb4 du chay bang Workbench hay mysql CLI.
SET NAMES utf8mb4;

-- ========================================================
-- 2. TAI KHOAN & GOI THANH VIEN
-- ========================================================

CREATE TABLE subscription_plans (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    duration_days INT NOT NULL,
    description TEXT,
    max_reading_limit INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `users` (
    `user_id` BIGINT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NULL,
    `avatar_url` VARCHAR(255) NULL,
    `bio` TEXT NULL,

    `role` VARCHAR(20)
        NOT NULL DEFAULT 'USER',

    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`user_id`),

    UNIQUE KEY `uk_users_username` (`username`),
    UNIQUE KEY `uk_users_email` (`email`),

    KEY `idx_users_role` (`role`),
    KEY `idx_users_active` (`is_active`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE user_subscriptions (
    sub_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan_id INT NOT NULL,
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NOT NULL,
    status ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') DEFAULT 'ACTIVE',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id)
);

-- ========================================================
-- 3. KHO SACH & DOC ONLINE
-- ========================================================

-- Nha ban tren san. Moi tai khoan role = SHOP so huu dung mot shop.
CREATE TABLE `shops` (
    `shop_id` BIGINT NOT NULL AUTO_INCREMENT,
    `owner_id` BIGINT NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `avatar_url` VARCHAR(255) NULL,
    `rating` DECIMAL(2, 1) NOT NULL DEFAULT 5.0,
    `follower_count` INT NOT NULL DEFAULT 0,
    `is_verified` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME(6) NOT NULL,

    PRIMARY KEY (`shop_id`),
    UNIQUE KEY `uk_shops_owner` (`owner_id`),

    CONSTRAINT `fk_shops_owner`
        FOREIGN KEY (`owner_id`)
        REFERENCES `users` (`user_id`)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE authors (
    author_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    bio TEXT
);

CREATE TABLE `books` (
    `book_id` BIGINT NOT NULL AUTO_INCREMENT,
    `shop_id` BIGINT NULL,
    `title` VARCHAR(255) NOT NULL,
    `author_id` INT NULL,
    `category_id` INT NULL,
    `description` TEXT NULL,
    `cover_image_url` VARCHAR(500) NULL,
    `page_count` INT NULL,
    `tags` VARCHAR(500) NULL,
    `is_digital` BOOLEAN NOT NULL DEFAULT FALSE,
    `is_for_sale` BOOLEAN NOT NULL DEFAULT TRUE,
    `sale_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `original_price` DECIMAL(10, 2) NULL,
    `stock_quantity` INT NOT NULL DEFAULT 0,
    `sold_count` INT NOT NULL DEFAULT 0,
    `rating_avg` DECIMAL(2, 1) NOT NULL DEFAULT 0.0,
    `rating_count` INT NOT NULL DEFAULT 0,
    `requires_vip` BOOLEAN NOT NULL DEFAULT FALSE,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(6) NOT NULL,
    `updated_at` DATETIME(6) NULL,

    PRIMARY KEY (`book_id`),
    KEY `idx_books_shop` (`shop_id`),
    KEY `idx_books_status` (`status`),
    KEY `idx_books_category` (`category_id`),

    CONSTRAINT `fk_books_shop`
        FOREIGN KEY (`shop_id`)
        REFERENCES `shops` (`shop_id`)
        ON DELETE SET NULL,
    CONSTRAINT `fk_books_author`
        FOREIGN KEY (`author_id`)
        REFERENCES `authors` (`author_id`)
        ON DELETE SET NULL,
    CONSTRAINT `fk_books_category`
        FOREIGN KEY (`category_id`)
        REFERENCES `categories` (`category_id`)
        ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE book_chapters (
    chapter_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    book_id BIGINT NOT NULL,
    chapter_index INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_url VARCHAR(255),
    content_text LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE
);

CREATE TABLE reading_progress (
    progress_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    book_id BIGINT NOT NULL,
    current_chapter_id BIGINT,
    last_position VARCHAR(50),
    percent_completed DECIMAL(5, 2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_book (user_id, book_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
    FOREIGN KEY (current_chapter_id) REFERENCES book_chapters(chapter_id) ON DELETE SET NULL
);

-- ========================================================
-- 4. FANPAGE & HOI NHOM (PAGES & CLUBS)
-- ========================================================

CREATE TABLE pages (
    page_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    bio TEXT,
    avatar_url VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE page_admins (
    page_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role ENUM('OWNER', 'EDITOR', 'MODERATOR') DEFAULT 'EDITOR',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (page_id, user_id),
    FOREIGN KEY (page_id) REFERENCES pages(page_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE book_clubs (
    club_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    cover_url VARCHAR(255),
    owner_id BIGINT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE club_members (
    club_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role ENUM('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER') DEFAULT 'MEMBER',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (club_id, user_id),
    FOREIGN KEY (club_id) REFERENCES book_clubs(club_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ========================================================
-- 5. BAI DANG, TUONG TAC & STORY
-- ========================================================

CREATE TABLE `posts` (
    `post_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `page_id` BIGINT NULL,
    `club_id` BIGINT NULL,
    `book_id` BIGINT NULL,
    `content` TEXT NOT NULL,
    `media_url` VARCHAR(255) NULL,
    `visibility` ENUM('PUBLIC', 'FRIENDS', 'CLUB_ONLY') NOT NULL DEFAULT 'PUBLIC',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`post_id`),

    KEY `idx_posts_user_id` (`user_id`),
    KEY `idx_posts_page_id` (`page_id`),
    KEY `idx_posts_club_id` (`club_id`),
    KEY `idx_posts_book_id` (`book_id`),
    KEY `idx_posts_created_at` (`created_at`),
    KEY `idx_posts_visibility` (`visibility`),

    CONSTRAINT `fk_posts_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`user_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_posts_page`
        FOREIGN KEY (`page_id`)
        REFERENCES `pages` (`page_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_posts_club`
        FOREIGN KEY (`club_id`)
        REFERENCES `book_clubs` (`club_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_posts_book`
        FOREIGN KEY (`book_id`)
        REFERENCES `books` (`book_id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE post_reactions (
    reaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reaction_type ENUM('LIKE', 'LOVE', 'BOOKWORM', 'INSIGHTFUL') DEFAULT 'LIKE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_post_user (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE comments (
    comment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_comment_id BIGINT DEFAULT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE
);

CREATE TABLE stories (
    story_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    media_url VARCHAR(255) NOT NULL,
    caption VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE story_views (
    story_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, user_id),
    FOREIGN KEY (story_id) REFERENCES stories(story_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);


CREATE TABLE `notifications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `message` VARCHAR(255) NOT NULL,
    `link` VARCHAR(255) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME(6) NULL,

    PRIMARY KEY (`id`),
    KEY `idx_notifications_user_id` (`user_id`),
    KEY `idx_notifications_created_at` (`created_at`),

    CONSTRAINT `fk_notifications_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`user_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- 6. MUA BAN & TRAO DOI SACH
-- ========================================================

-- Ma giam gia toan san.
CREATE TABLE `vouchers` (
    `voucher_id` INT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `discount_type` VARCHAR(20) NOT NULL,
    `discount_value` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `max_discount` DECIMAL(10, 2) NULL,
    `min_order_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (`voucher_id`),
    UNIQUE KEY `uk_vouchers_code` (`code`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Hop Blind Book: he thong ghep mot cuon theo tam trang + muc hop.
CREATE TABLE `blind_boxes` (
    `box_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `book_id` BIGINT NOT NULL,
    `tier` VARCHAR(20) NOT NULL,
    `mood` VARCHAR(20) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `revealed_at` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL,

    PRIMARY KEY (`box_id`),
    KEY `idx_blind_boxes_user` (`user_id`, `status`),

    CONSTRAINT `fk_blind_boxes_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`user_id`)
        ON DELETE CASCADE,
    CONSTRAINT `fk_blind_boxes_book`
        FOREIGN KEY (`book_id`)
        REFERENCES `books` (`book_id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Gio hang luu tren server.
CREATE TABLE `cart_items` (
    `cart_item_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `book_id` BIGINT NULL,
    `blind_box_id` BIGINT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `created_at` DATETIME(6) NOT NULL,

    PRIMARY KEY (`cart_item_id`),
    UNIQUE KEY `uk_cart_user_book` (`user_id`, `book_id`),
    UNIQUE KEY `uk_cart_blind_box` (`blind_box_id`),

    CONSTRAINT `fk_cart_items_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`user_id`)
        ON DELETE CASCADE,
    CONSTRAINT `fk_cart_items_book`
        FOREIGN KEY (`book_id`)
        REFERENCES `books` (`book_id`)
        ON DELETE CASCADE,
    CONSTRAINT `fk_cart_items_blind_box`
        FOREIGN KEY (`blind_box_id`)
        REFERENCES `blind_boxes` (`box_id`)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Don hang: gio hang duoc tach thanh mot don cho moi shop.
CREATE TABLE `orders` (
    `order_id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_code` VARCHAR(20) NOT NULL,
    `user_id` BIGINT NOT NULL,
    `shop_id` BIGINT NULL,
    `recipient_name` VARCHAR(100) NOT NULL,
    `recipient_phone` VARCHAR(20) NOT NULL,
    `shipping_address` TEXT NOT NULL,
    `note` VARCHAR(500) NULL,
    `payment_method` VARCHAR(20) NOT NULL DEFAULT 'COD',
    `voucher_code` VARCHAR(30) NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `shipping_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(6) NOT NULL,
    `updated_at` DATETIME(6) NULL,

    PRIMARY KEY (`order_id`),
    UNIQUE KEY `uk_orders_code` (`order_code`),
    KEY `idx_orders_user` (`user_id`, `created_at`),
    KEY `idx_orders_shop` (`shop_id`, `created_at`),
    KEY `idx_orders_status` (`status`),

    CONSTRAINT `fk_orders_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`user_id`),
    CONSTRAINT `fk_orders_shop`
        FOREIGN KEY (`shop_id`)
        REFERENCES `shops` (`shop_id`)
        ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_items` (
    `item_id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `book_id` BIGINT NOT NULL,
    `blind_box_id` BIGINT NULL,
    `book_title` VARCHAR(255) NOT NULL,
    `cover_image_url` VARCHAR(500) NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`item_id`),
    KEY `idx_order_items_order` (`order_id`),
    KEY `idx_order_items_book` (`book_id`),

    CONSTRAINT `fk_order_items_order`
        FOREIGN KEY (`order_id`)
        REFERENCES `orders` (`order_id`)
        ON DELETE CASCADE,
    CONSTRAINT `fk_order_items_book`
        FOREIGN KEY (`book_id`)
        REFERENCES `books` (`book_id`),
    CONSTRAINT `fk_order_items_blind_box`
        FOREIGN KEY (`blind_box_id`)
        REFERENCES `blind_boxes` (`box_id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Lich su trang thai don hang.
CREATE TABLE `order_status_history` (
    `history_id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `note` VARCHAR(255) NULL,
    `created_at` DATETIME(6) NOT NULL,

    PRIMARY KEY (`history_id`),
    KEY `idx_order_history_order` (`order_id`, `created_at`),

    CONSTRAINT `fk_order_history_order`
        FOREIGN KEY (`order_id`)
        REFERENCES `orders` (`order_id`)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- San trao doi sach cu P2P.
CREATE TABLE `exchange_listings` (
    `listing_id` BIGINT NOT NULL AUTO_INCREMENT,
    `owner_id` BIGINT NOT NULL,
    `book_title` VARCHAR(255) NOT NULL,
    `wanted` VARCHAR(255) NOT NULL,
    `book_condition` VARCHAR(30) NOT NULL,
    `location` VARCHAR(100) NOT NULL,
    `cover_url` VARCHAR(500) NULL,
    `note` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    `created_at` DATETIME(6) NOT NULL,
    `updated_at` DATETIME(6) NULL,

    PRIMARY KEY (`listing_id`),
    KEY `idx_exchange_listings_owner` (`owner_id`),
    KEY `idx_exchange_listings_status` (`status`, `created_at`),

    CONSTRAINT `fk_exchange_listings_owner`
        FOREIGN KEY (`owner_id`)
        REFERENCES `users` (`user_id`)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- De nghi trao doi gui toi mot tin dang.
CREATE TABLE `exchange_offers` (
    `offer_id` BIGINT NOT NULL AUTO_INCREMENT,
    `listing_id` BIGINT NOT NULL,
    `sender_id` BIGINT NOT NULL,
    `offered_book` VARCHAR(255) NOT NULL,
    `message` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(6) NOT NULL,
    `responded_at` DATETIME(6) NULL,

    PRIMARY KEY (`offer_id`),
    KEY `idx_exchange_offers_listing` (`listing_id`, `status`),
    KEY `idx_exchange_offers_sender` (`sender_id`),

    CONSTRAINT `fk_exchange_offers_listing`
        FOREIGN KEY (`listing_id`)
        REFERENCES `exchange_listings` (`listing_id`)
        ON DELETE CASCADE,
    CONSTRAINT `fk_exchange_offers_sender`
        FOREIGN KEY (`sender_id`)
        REFERENCES `users` (`user_id`)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- 7. BAO CAO VI PHAM
-- ========================================================

CREATE TABLE reports (
    report_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reporter_id BIGINT NOT NULL,
    target_type ENUM('POST', 'COMMENT', 'USER', 'CLUB') NOT NULL,
    target_id BIGINT NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('PENDING', 'RESOLVED', 'DISMISSED') DEFAULT 'PENDING',
    resolved_by BIGINT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================================
-- 8. GAMIFICATION & BANG XEP HANG
-- ========================================================

CREATE TABLE user_activities (
    activity_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    activity_type ENUM('READ_CHAPTER', 'CREATE_POST', 'WRITE_REVIEW', 'EXCHANGE_BOOK', 'LOGIN_STREAK') NOT NULL,
    points_awarded INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE user_points (
    user_id BIGINT PRIMARY KEY,
    total_points INT DEFAULT 0,
    monthly_points INT DEFAULT 0,
    current_tier VARCHAR(50) DEFAULT 'Tap Su',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ========================================================
-- 9. TOI UU HOA CHI MUC (INDEXES)
-- ========================================================

CREATE INDEX idx_posts_feed ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_club ON posts(club_id);
CREATE INDEX idx_posts_page ON posts(page_id);
CREATE INDEX idx_stories_active ON stories(expires_at);
CREATE INDEX idx_user_rankings ON user_points(monthly_points DESC, total_points DESC);

-- ========================================================
-- 10. DU LIEU MAU DE DEMO
-- ========================================================
-- Mat khau moi tai khoan mau: 123456
--   user@bookigma.vn   (ducanh)  - doc gia, co san don hang va mot hop Blind Book da giao
--   shop@bookigma.vn   (fahasa)  - chu shop Fahasa Official
--   nxbtre@bookigma.vn (nxbtre)  - chu shop NXB Tre
--   admin@bookigma.vn  (admin)   - quan tri vien, duyet san pham moi
-- Thoi gian dung UTC_TIMESTAMP() vi backend ket noi voi serverTimezone=UTC.

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE notifications;
TRUNCATE TABLE exchange_offers;
TRUNCATE TABLE exchange_listings;
TRUNCATE TABLE order_status_history;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE blind_boxes;
TRUNCATE TABLE cart_items;
TRUNCATE TABLE vouchers;
TRUNCATE TABLE book_chapters;
TRUNCATE TABLE reading_progress;
TRUNCATE TABLE books;
TRUNCATE TABLE authors;
TRUNCATE TABLE categories;
TRUNCATE TABLE shops;
TRUNCATE TABLE story_views;
TRUNCATE TABLE stories;
TRUNCATE TABLE post_reactions;
TRUNCATE TABLE comments;
TRUNCATE TABLE posts;
TRUNCATE TABLE club_members;
TRUNCATE TABLE book_clubs;
TRUNCATE TABLE page_admins;
TRUNCATE TABLE pages;
TRUNCATE TABLE user_activities;
TRUNCATE TABLE user_points;
TRUNCATE TABLE user_subscriptions;
TRUNCATE TABLE subscription_plans;
TRUNCATE TABLE reports;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------
-- GOI DICH VU
-- --------------------------------------------------------
INSERT INTO subscription_plans (plan_id, name, price, duration_days, description, max_reading_limit) VALUES
(1, 'Gói Miễn Phí (Standard Free)',          0.00,    3650, 'Đọc các đầu sách kinh điển cộng đồng, tham gia thảo luận nhóm.', 3),
(2, 'Gói Mọt Sách Tháng (Bookworm Monthly)', 59000.00,  30, 'Đọc toàn bộ kho sách VIP không giới hạn, không có quảng cáo trong 30 ngày.', NULL),
(3, 'Gói Mọt Sách Quý (Bookworm Quarterly)', 159000.00, 90, 'Tiết kiệm 10%, mở khóa toàn bộ sách VIP và huy hiệu độc quyền.', NULL),
(4, 'Gói Học Giả Năm (Scholar Yearly)',      599000.00, 365,'Đọc sách VIP không giới hạn cả năm, giảm giá 10% khi mua sách giấy.', NULL);

-- --------------------------------------------------------
-- TAI KHOAN NGUOI DUNG
-- --------------------------------------------------------
INSERT INTO `users` (`user_id`, `username`, `email`, `password_hash`, `full_name`, `avatar_url`, `bio`, `role`, `is_active`, `created_at`) VALUES
(1, 'ducanh',   'user@bookigma.vn',   '$2a$10$KsgnH9AMOcdtNizkcggv2.4NCnNKXmFUofpIRi0jLfpXa.KQNtcSW', 'Trần Đức Anh',     'https://i.pravatar.cc/150?img=12', 'Sinh viên năm 3, thích sách kỹ năng và truyền cảm hứng.', 'USER',  TRUE, UTC_TIMESTAMP(6) - INTERVAL 258 DAY),
(2, 'hoangnam', 'nam@bookigma.vn',    '$2a$10$HmOcA4ZYbXnuc0/f1BGm4eEzENpIPNDb4n.BYiqVg8LwXkWvnQ0Pa', 'Nguyễn Hoàng Nam', 'https://i.pravatar.cc/150?img=33', 'Mê văn học Việt Nam.', 'USER',  TRUE, UTC_TIMESTAMP(6) - INTERVAL 239 DAY),
(3, 'lethao',   'thao@bookigma.vn',   '$2a$10$qyCjZY4tVzXy2LV7MuSoEOAO0SeRMcxWomhgvvPy84mpCVaX.PP32', 'Lê Thảo',          'https://i.pravatar.cc/150?img=47', 'Review sách mỗi tuần.', 'USER',  TRUE, UTC_TIMESTAMP(6) - INTERVAL 221 DAY),
(4, 'lananh',   'lananh@bookigma.vn', '$2a$10$EJAXBcJyHMrUt6YDmEBr6u78C1.Adp4x35RnYoz66LM0rRWtm7mKi', 'Vũ Lan Anh',       'https://i.pravatar.cc/150?img=45', 'Thích sách thiếu nhi.', 'USER',  TRUE, UTC_TIMESTAMP(6) - INTERVAL 195 DAY),
(5, 'fahasa',   'shop@bookigma.vn',   '$2a$10$xLSIdddmYOofK6IBrVnh/OqDcNmjMhsZ/NKbdsgXhH8zzu2d5qwaO', 'Fahasa Official',  'https://i.pravatar.cc/150?img=68', 'Nhà sách chính hãng.', 'SHOP',  TRUE, UTC_TIMESTAMP(6) - INTERVAL 332 DAY),
(6, 'nxbtre',   'nxbtre@bookigma.vn', '$2a$10$6AUN.I1gZmYaE9KFoN2xFuRie0L71HxoVjI4r5GviHmaeAB.ZCtGq', 'NXB Trẻ',          'https://i.pravatar.cc/150?img=3',  'Nhà xuất bản Trẻ.', 'SHOP',  TRUE, UTC_TIMESTAMP(6) - INTERVAL 293 DAY),
(7, 'admin',    'admin@bookigma.vn',  '$2a$10$O/UVsIoGUgAT7eORD/IJlOILDv0qaTnSq2lDQ/h7IDcPZBMLocWDG', 'Quản trị viên',    'https://i.pravatar.cc/150?img=59', NULL, 'ADMIN', TRUE, UTC_TIMESTAMP(6) - INTERVAL 363 DAY);

INSERT INTO user_points (user_id, total_points, monthly_points, current_tier) VALUES
(1, 820,  240, 'Học Giả Bạc'),
(2, 450,  120, 'Hộ Vệ Sách'),
(3, 310,   90, 'Tập Sự'),
(4, 180,   50, 'Tập Sự'),
(5, 0,     0,  'Quản Trị'),
(6, 0,     0,  'Quản Trị'),
(7, 0,     0,  'Quản Trị');

INSERT INTO user_subscriptions (user_id, plan_id, start_date, end_date, status) VALUES
(1, 4, UTC_TIMESTAMP() - INTERVAL 30  DAY, UTC_TIMESTAMP() + INTERVAL 335  DAY, 'ACTIVE'),
(2, 2, UTC_TIMESTAMP() - INTERVAL 10  DAY, UTC_TIMESTAMP() + INTERVAL 20   DAY, 'ACTIVE'),
(3, 1, UTC_TIMESTAMP() - INTERVAL 60  DAY, UTC_TIMESTAMP() + INTERVAL 3000 DAY, 'ACTIVE'),
(4, 1, UTC_TIMESTAMP() - INTERVAL 15  DAY, UTC_TIMESTAMP() + INTERVAL 3000 DAY, 'ACTIVE');

-- --------------------------------------------------------
-- SHOP
-- --------------------------------------------------------
INSERT INTO `shops` (`shop_id`, `owner_id`, `name`, `description`, `avatar_url`, `rating`, `follower_count`, `is_verified`, `created_at`) VALUES
(1, 5, 'Fahasa Official', 'Nhà sách Fahasa — sách chính hãng, giao hàng toàn quốc.',  'https://i.pravatar.cc/150?img=68', 4.8, 12400, TRUE, UTC_TIMESTAMP(6) - INTERVAL 332 DAY),
(2, 6, 'NXB Trẻ',         'Nhà xuất bản Trẻ — kho sách văn học và thiếu nhi.',        'https://i.pravatar.cc/150?img=3',  4.9,  8600, TRUE, UTC_TIMESTAMP(6) - INTERVAL 293 DAY);

-- --------------------------------------------------------
-- THE LOAI & TAC GIA
-- --------------------------------------------------------
INSERT INTO categories (category_id, name, slug) VALUES
(1, 'Truyền cảm hứng',     'truyen-cam-hung'),
(2, 'Tâm lý - Kỹ năng',    'tam-ly-ky-nang'),
(3, 'Văn học Việt Nam',    'van-hoc-viet-nam'),
(4, 'Văn học nước ngoài',  'van-hoc-nuoc-ngoai'),
(5, 'Khoa học - Công nghệ','khoa-hoc-cong-nghe'),
(6, 'Kinh tế',             'kinh-te'),
(7, 'Thiếu nhi',           'thieu-nhi');

INSERT INTO authors (author_id, name) VALUES
(1,  'Paulo Coelho'),
(2,  'Daniel Kahneman'),
(3,  'Dale Carnegie'),
(4,  'Nguyễn Nhật Ánh'),
(5,  'Yuval Noah Harari'),
(6,  'James Clear'),
(7,  'Nguyên Phong'),
(8,  'Rosie Nguyễn'),
(9,  'Fyodor Dostoevsky'),
(10, 'Kai-Fu Lee'),
(11, 'Tô Hoài'),
(12, 'José Mauro de Vasconcelos');

-- --------------------------------------------------------
-- KHO SACH
-- tags: cach nhau bang dau phay, khop voi StringListConverter cua backend
-- Ten the loai va tag phai CO DAU va viet y het BlindBoxMood (so khop chinh xac tung ky tu).
-- BlindBoxMood.MOTIVATION -> categories: Truyền cảm hứng, Tâm lý - Kỹ năng
--                         -> tags: ước mơ, hành trình, thói quen, phát triển bản thân, tuổi trẻ
-- BlindBoxMood.CRY        -> categories: Văn học Việt Nam, Văn học nước ngoài
--                         -> tags: buồn, cảm động, tuổi thơ, tình yêu, gia đình
-- BlindBoxMood.SKILL      -> categories: Tâm lý - Kỹ năng, Kinh tế
--                         -> tags: kỹ năng mềm, giao tiếp, năng suất, ra quyết định, thói quen
-- BlindBoxMood.ESCAPE     -> categories: Văn học nước ngoài, Thiếu nhi, Văn học Việt Nam
--                         -> tags: phiêu lưu, kinh điển, hành trình, tâm linh
-- BlindBoxMood.CURIOUS    -> categories: Khoa học - Công nghệ
--                         -> tags: khoa học, lịch sử, công nghệ, xã hội, tiến hóa
-- --------------------------------------------------------
INSERT INTO `books` (`book_id`, `shop_id`, `title`, `author_id`, `category_id`, `description`, `cover_image_url`, `page_count`, `tags`, `is_digital`, `is_for_sale`, `sale_price`, `original_price`, `stock_quantity`, `sold_count`, `rating_avg`, `rating_count`, `status`, `created_at`) VALUES
(1,  1, 'Nhà Giả Kim',                     1,  1, 'Câu chuyện về cậu bé chăn cừu Santiago đi tìm kho báu và khám phá ra vận mệnh của chính mình.',                   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',  228, 'triết lý,hành trình,ước mơ,tâm linh',           TRUE, TRUE,  79000,  99000, 148, 5120, 4.9, 2418, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL 120 DAY),
(2,  2, 'Tư Duy Nhanh Và Chậm',            2,  2, 'Giải Nobel Kinh tế Daniel Kahneman giải thích hai hệ thống chi phối cách chúng ta suy nghĩ.',                    'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80', 542, 'tâm lý học,ra quyết định,hành vi,khoa học',    TRUE, TRUE, 145000, 189000,  62, 2340, 4.8, 1180, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL 115 DAY),
(3,  1, 'Đắc Nhân Tâm',                    3,  2, 'Cuốn sách kinh điển về nghệ thuật giao tiếp và ứng xử, giúp xây dựng mối quan hệ bền vững.',                     'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',  320, 'giao tiếp,kỹ năng mềm,quan hệ',                 TRUE, TRUE,  89000, 110000, 320, 8800, 4.7, 3902, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL 110 DAY),
(4,  2, 'Mắt Biếc',                        4,  3, 'Câu chuyện tình đơn phương day dứt của Ngạn dành cho Hà Lan, trải dài từ làng Đo Đo tới thành phố.',             'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&q=80',  268, 'tình yêu,tuổi thơ,làng quê,buồn',               TRUE, TRUE,  95000, 120000,  95, 6400, 4.9, 2760, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL 105 DAY),
(5,  1, 'Sapiens: Lược Sử Loài Người',     5,  5, 'Hành trình 70.000 năm của loài Homo sapiens, từ những bầy người săn bắt hái lượm đến chủ nhân của hành tinh.',  'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80',  554, 'lịch sử,tiến hóa,xã hội,khoa học',              TRUE, TRUE, 199000, 259000,  48, 3100, 4.8, 1540, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL 100 DAY),
(6,  1, 'Atomic Habits - Thay Đổi Tí Hon', 6,  2, 'Phương pháp đã được chứng minh để xây dựng thói quen tốt bằng những thay đổi 1% mỗi ngày.',                    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80',   320, 'thói quen,năng suất,phát triển bản thân',       TRUE, TRUE, 139000, 169000, 210, 4500, 4.9, 2210, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL  95 DAY),
(7,  2, 'Muôn Kiếp Nhân Sinh',             7,  1, 'Những câu chuyện về luân hồi, nhân quả và ý nghĩa sâu xa của kiếp người qua lời kể của Thomas.',               'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80',  398, 'tâm linh,triết lý,nhân quả,hành trình',         TRUE, TRUE, 129000, 158000,  76, 3900, 4.7, 1890, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL  90 DAY),
(8,  2, 'Tuổi Trẻ Đáng Giá Bao Nhiêu',     8,  1, 'Cuốn sách gối đầu giường của người trẻ Việt về học, làm và đi.',                                               'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400&q=80',  285, 'tuổi trẻ,phát triển bản thân,du lịch',          TRUE, TRUE,  75000,  90000, 130, 2800, 4.5, 1420, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL  85 DAY),
(9,  1, 'Tội Ác Và Hình Phạt',             9,  4, 'Kiệt tác tâm lý về tội lỗi, sự dằn vặt và con đường cứu chuộc của Raskolnikov.',                                'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&q=80',  671, 'kinh điển,tâm lý,triết lý,Nga',                 TRUE, TRUE, 165000, 199000,  34, 1200, 4.6,  880, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL  80 DAY),
(10, 1, 'AI Và Tương Lai Loài Người',     10,  5, 'Cuộc đua AI giữa Mỹ và Trung Quốc và những gì nó có nghĩa với công việc, xã hội và ý nghĩa cuộc sống.',        'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&q=80',  412, 'công nghệ,AI,tương lai,kinh tế',                TRUE, TRUE, 189000, 229000,  55,  980, 4.6,  640, 'PENDING', UTC_TIMESTAMP(6) - INTERVAL   2 DAY),
(11, 2, 'Dế Mèn Phiêu Lưu Ký',            11,  7, 'Cuộc phiêu lưu kinh điển của chú Dế Mèn, tác phẩm thiếu nhi được yêu thích nhất Việt Nam.',                    'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&q=80',  168, 'thiếu nhi,phiêu lưu,kinh điển,Việt Nam',        TRUE, TRUE,  58000,  72000, 240, 5600, 4.8, 1980, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL  70 DAY),
(12, 2, 'Cây Cam Ngọt Của Tôi',           12,  4, 'Câu chuyện cảm động về cậu bé Zezé và cây cam ngọt — người bạn tưởng tượng của em.',                           'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400&q=80',  244, 'tuổi thơ,cảm động,gia đình,buồn',               TRUE, TRUE, 108000, 128000,  88, 7200, 4.9, 3100, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL  65 DAY);

-- --------------------------------------------------------
-- NOI DUNG DOC THU (BOOK CHAPTERS)
-- --------------------------------------------------------
INSERT INTO book_chapters (book_id, chapter_index, title, content_text) VALUES
(1, 1, 'Chương 1: Tiếng gọi từ vũ trụ',
 'Cậu tên là Santiago. Trời đã chập tối khi cậu cùng đàn cừu đến một nhà thờ cổ sụp đổ, mái đã sập từ lâu và một cây chăn lớn đã mọc lên ngay nơi xưa là phòng thánh.\n\nCậu quyết định ngủ lại đấy qua đêm. Khi cậu thức giấc thì trời hãy còn tối. Nhìn lên, cậu thấy các vì sao lấp lánh qua mái nhà thủng. Cậu vừa mơ đúng giấc mơ tuần trước và lại tỉnh dậy trước khi giấc mơ chấm dứt.'),
(1, 2, 'Chương 2: Ông vua già xứ Salem',
 'Ông già mặc áo choàng ngồi xuống cạnh cậu. Ông nói rằng ông là Melchizedek, vua xứ Salem.\n\n"Vận mệnh là điều mà con hằng mong muốn thực hiện," ông nói. "Ai cũng biết được vận mệnh của mình khi còn trẻ."\n\n"Khi con thật sự mong muốn điều gì, cả vũ trụ sẽ chung sức giúp con đạt được điều ấy," ông vua nói, rồi biến mất vào ánh nắng ban trưa.'),
(1, 3, 'Chương 3: Sa mạc và bài học của gió',
 'Đoàn lữ hành đi vào sa mạc. Cát trải dài đến tận chân trời, và mỗi ngày Santiago lại học được một điều mới từ sự im lặng mênh mông ấy.\n\nNgười luyện kim đan nói: "Sa mạc sẽ dạy con tất cả, nhưng nó đòi hỏi con phải lắng nghe. Con phải học ngôn ngữ mà mọi vật trên đời đều nói chung."'),
(2, 1, 'Chương 1: Hai hệ thống',
 'Hệ thống 1 hoạt động tự động và nhanh chóng, hầu như không cần nỗ lực và không có cảm giác về sự kiểm soát có chủ ý.\n\nHệ thống 2 phân bổ sự chú ý cho các hoạt động tinh thần đòi hỏi nỗ lực. Khi chúng ta nghĩ về bản thân mình, ta đồng nhất với Hệ thống 2 — nhưng phần lớn quyết định trong ngày lại do Hệ thống 1 âm thầm đưa ra.'),
(2, 2, 'Chương 2: Sự chú ý và nỗ lực',
 'Hệ thống 2 có khả năng hạn chế. Khi bạn đang bận rộn với một việc đòi hỏi nỗ lực, bạn gần như mù trước những gì đang xảy ra xung quanh.\n\nThí nghiệm "con khỉ vô hình" cho thấy khi tập trung đếm số lần chuyền bóng, một nửa số người xem hoàn toàn không nhìn thấy người mặc đồ khỉ đi ngang qua màn hình.'),
(3, 1, 'Chương 1: Muốn lấy mật đừng phá tổ ong',
 'Ngày 7 tháng 5 năm 1931, thành phố New York chứng kiến cuộc vây bắt tội phạm gay cấn nhất trong lịch sử. "Hai Khẩu Súng" Crowley bị bao vây trên căn hộ ở đại lộ West End.\n\nBài học: chỉ trích là vô ích, bởi nó khiến người ta phải phòng thủ và thường làm họ cố sức biện minh cho mình.'),
(4, 1, 'Chương 1: Làng Đo Đo',
 'Tôi sinh ra ở làng Đo Đo. Làng tôi nhỏ, nhỏ đến mức chỉ cần đứng ở đầu làng gọi to một tiếng là cuối làng đã nghe.\n\nHà Lan có đôi mắt rất đẹp. Mắt to, tròn và đen láy. Nhưng cái đẹp của đôi mắt ấy không nằm ở hình dáng mà nằm ở cái nhìn — một cái nhìn khiến người ta thấy mình vừa được che chở vừa bị bỏ rơi.'),
(5, 1, 'Chương 1: Một loài vật chẳng có gì đặc biệt',
 'Khoảng 13,5 tỷ năm trước, vật chất, năng lượng, thời gian và không gian ra đời trong sự kiện gọi là Vụ Nổ Lớn.\n\nHomo sapiens xuất hiện ở Đông Phi khoảng 200.000 năm trước. Trong phần lớn lịch sử, chúng ta là một loài vật tầm thường, đứng giữa chuỗi thức ăn.'),
(6, 1, 'Chương 1: Sức mạnh đáng kinh ngạc của thói quen nguyên tử',
 'Nếu bạn tốt hơn 1% mỗi ngày trong một năm, cuối cùng bạn sẽ tốt hơn 37 lần. Ngược lại, nếu tệ đi 1% mỗi ngày, bạn gần như trở về con số 0.\n\nThói quen là lãi kép của sự tự cải thiện. Chúng có vẻ nhỏ bé và vô nghĩa ở thời điểm hiện tại, nhưng qua nhiều tháng năm chúng tạo ra khác biệt khổng lồ.'),
(7, 1, 'Chương 1: Cuộc gặp gỡ định mệnh',
 'Thomas là một nhà tài chính thành đạt ở New York. Nhưng đằng sau sự thành công ấy là những giấc mơ lặp đi lặp lại về một kiếp sống khác, ở một vùng đất khác.\n\nÔng kể: "Tôi thấy mình đứng giữa đền Karnak, mặc áo tu sĩ, và biết rõ từng viên đá ở đó — dù đời này tôi chưa từng đặt chân đến Ai Cập."'),
(8, 1, 'Chương 1: Học',
 'Tôi tin rằng thứ tài sản lớn nhất của tuổi trẻ không phải là thời gian, mà là khả năng học hỏi nhanh hơn bất kỳ giai đoạn nào khác của đời người.\n\nMỗi cuốn sách bạn đọc là một cuộc đối thoại với người thông minh nhất trong lĩnh vực đó, với giá rẻ hơn một bữa ăn.'),
(9, 1, 'Chương 1: Căn gác xép',
 'Vào một buổi chiều nóng nực đầu tháng Bảy, một chàng trai trẻ bước ra khỏi căn gác xép thuê lại ở ngõ S., chậm rãi và như còn lưỡng lự, đi về phía cầu K.\n\nChàng đã mắc nợ bà chủ nhà và sợ gặp bà ta. Không phải vì chàng nhút nhát — mà vì từ lâu chàng đã rơi vào trạng thái căng thẳng và cáu bẳn giống như chứng nghi bệnh.'),
(10, 1, 'Chương 1: Khoảnh khắc Sputnik của Trung Quốc',
 'Tháng 5 năm 2017, AlphaGo đánh bại Kha Khiết — kỳ thủ cờ vây số một thế giới. Với phương Tây đó là một tin công nghệ. Với Trung Quốc, đó là khoảnh khắc Sputnik.'),
(11, 1, 'Chương 1: Tôi sống độc lập từ thuở bé',
 'Tôi sống độc lập từ thuở bé. Ấy là tục lệ lâu đời trong họ nhà dế chúng tôi. Vả lại, mẹ thường bảo chúng tôi rằng: "Phải như thế để các con biết kiếm ăn một mình cho quen đi."'),
(12, 1, 'Chương 1: Người khám phá ra mọi thứ',
 'Chúng tôi nắm tay nhau đi dọc phố. Totoca chẳng vội gì. Anh dạy tôi biết cuộc sống là thế nào. Và điều đó khiến tôi rất hài lòng, vì anh tôi là người khám phá ra mọi thứ.');

-- --------------------------------------------------------
-- MA GIAM GIA (VOUCHERS)
-- --------------------------------------------------------
INSERT INTO `vouchers` (`code`, `label`, `discount_type`, `discount_value`, `max_discount`, `min_order_amount`, `is_active`) VALUES
('BOOKIGMA10', 'Giảm 10% tối đa 30.000đ',          'PERCENT', 10.00,    30000.00, 100000.00, TRUE),
('FREESHIP',   'Miễn phí vận chuyển',               'SHIPPING', 0.00,      NULL,  150000.00, TRUE),
('GIAM50K',    'Giảm 50.000đ cho đơn từ 300.000đ',  'AMOUNT',  50000.00,  NULL,   300000.00, TRUE);

-- --------------------------------------------------------
-- BLIND BOX MAU
-- Mot hop da giao de demo "Mo hop" ngay khi vao trang don hang.
-- --------------------------------------------------------
INSERT INTO `blind_boxes` (`box_id`, `user_id`, `book_id`, `tier`, `mood`, `price`, `status`, `revealed_at`, `created_at`) VALUES
(1, 1, 7, 'STANDARD', 'MOTIVATION', 150000.00, 'ORDERED', NULL, UTC_TIMESTAMP(6) - INTERVAL 72 HOUR);

-- --------------------------------------------------------
-- DON HANG MAU
-- --------------------------------------------------------
INSERT INTO `orders` (`order_id`, `order_code`, `user_id`, `shop_id`, `recipient_name`, `recipient_phone`, `shipping_address`, `note`, `payment_method`, `voucher_code`, `subtotal`, `shipping_fee`, `discount_amount`, `total_amount`, `status`, `created_at`, `updated_at`) VALUES
(1, 'BKG240915', 1, 1, 'Trần Đức Anh',    '0901234567', '12 Nguyễn Trãi, Thanh Xuân, Hà Nội',     NULL,                    'COD',  NULL,         89000.00, 25000.00,     0.00, 114000.00, 'COMPLETED', UTC_TIMESTAMP(6) - INTERVAL 288 HOUR, UTC_TIMESTAMP(6) - INTERVAL 192 HOUR),
(2, 'BKG240920', 1, 1, 'Trần Đức Anh',    '0901234567', '12 Nguyễn Trãi, Thanh Xuân, Hà Nội',     NULL,                    'BANK', 'BOOKIGMA10',297000.00, 25000.00, 29700.00, 292300.00, 'SHIPPING',  UTC_TIMESTAMP(6) - INTERVAL  96 HOUR, UTC_TIMESTAMP(6) - INTERVAL  48 HOUR),
(3, 'BKG240922', 3, 2, 'Lê Thảo',         '0912345678', '45 Lê Lợi, Quận 1, TP.HCM',              NULL,                    'MOMO', NULL,        108000.00, 25000.00,     0.00, 133000.00, 'PENDING',   UTC_TIMESTAMP(6) - INTERVAL  48 HOUR, NULL),
(4, 'BKG240918', 4, 2, 'Vũ Lan Anh',      '0987654321', '88 Trần Phú, Hải Châu, Đà Nẵng',         'Gói quà giúp mình nhé', 'COD',  'FREESHIP',  174000.00,     0.00,     0.00, 174000.00, 'CONFIRMED', UTC_TIMESTAMP(6) - INTERVAL 144 HOUR, UTC_TIMESTAMP(6) - INTERVAL 132 HOUR),
(5, 'BKG240910', 2, 1, 'Nguyễn Hoàng Nam','0933222111', '7 Cầu Giấy, Hà Nội',                     NULL,                    'COD',  NULL,        199000.00, 25000.00,     0.00, 224000.00, 'CANCELLED', UTC_TIMESTAMP(6) - INTERVAL 360 HOUR, UTC_TIMESTAMP(6) - INTERVAL 336 HOUR),
(6, 'BKG240921', 1, 2, 'Trần Đức Anh',    '0901234567', '12 Nguyễn Trãi, Thanh Xuân, Hà Nội',     NULL,                    'MOMO', NULL,        150000.00, 25000.00,     0.00, 175000.00, 'DELIVERED', UTC_TIMESTAMP(6) - INTERVAL  72 HOUR, UTC_TIMESTAMP(6) - INTERVAL  12 HOUR);

INSERT INTO `order_items` (`order_id`, `book_id`, `blind_box_id`, `book_title`, `cover_image_url`, `quantity`, `unit_price`) VALUES
(1, 3,  NULL, 'Đắc Nhân Tâm',                  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80', 1,  89000.00),
(2, 6,  NULL, 'Atomic Habits - Thay Đổi Tí Hon','https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80', 1, 139000.00),
(2, 1,  NULL, 'Nhà Giả Kim',                   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',  2,  79000.00),
(3, 12, NULL, 'Cây Cam Ngọt Của Tôi',           'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400&q=80', 1, 108000.00),
(4, 11, NULL, 'Dế Mèn Phiêu Lưu Ký',            'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&q=80', 3,  58000.00),
(5, 5,  NULL, 'Sapiens: Lược Sử Loài Người',    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80', 1, 199000.00),
(6, 7,  1,    'Muôn Kiếp Nhân Sinh',             'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80', 1, 150000.00);

INSERT INTO `order_status_history` (`order_id`, `status`, `note`, `created_at`) VALUES
(1, 'PENDING',   'Đơn hàng được tạo',                                         UTC_TIMESTAMP(6) - INTERVAL 288 HOUR),
(1, 'CONFIRMED', 'Shop xác nhận đơn hàng',                                    UTC_TIMESTAMP(6) - INTERVAL 283 HOUR),
(1, 'SHIPPING',  'Đang giao bởi GHTK',                                        UTC_TIMESTAMP(6) - INTERVAL 264 HOUR),
(1, 'DELIVERED', 'Giao hàng thành công',                                      UTC_TIMESTAMP(6) - INTERVAL 216 HOUR),
(1, 'COMPLETED', 'Khách xác nhận đã nhận hàng',                               UTC_TIMESTAMP(6) - INTERVAL 192 HOUR),
(2, 'PENDING',   'Đơn hàng được tạo',                                         UTC_TIMESTAMP(6) - INTERVAL  96 HOUR),
(2, 'CONFIRMED', 'Shop xác nhận đơn hàng',                                    UTC_TIMESTAMP(6) - INTERVAL  86 HOUR),
(2, 'SHIPPING',  'Đang giao bởi GHN',                                         UTC_TIMESTAMP(6) - INTERVAL  48 HOUR),
(3, 'PENDING',   'Đơn hàng được tạo',                                         UTC_TIMESTAMP(6) - INTERVAL  48 HOUR),
(4, 'PENDING',   'Đơn hàng được tạo',                                         UTC_TIMESTAMP(6) - INTERVAL 144 HOUR),
(4, 'CONFIRMED', 'Shop xác nhận đơn hàng',                                    UTC_TIMESTAMP(6) - INTERVAL 132 HOUR),
(5, 'PENDING',   'Đơn hàng được tạo',                                         UTC_TIMESTAMP(6) - INTERVAL 360 HOUR),
(5, 'CANCELLED', 'Khách hủy: đặt nhầm số lượng',                              UTC_TIMESTAMP(6) - INTERVAL 336 HOUR),
(6, 'PENDING',   'Đơn hàng được tạo',                                         UTC_TIMESTAMP(6) - INTERVAL  72 HOUR),
(6, 'CONFIRMED', 'Shop xác nhận đơn hàng',                                    UTC_TIMESTAMP(6) - INTERVAL  67 HOUR),
(6, 'SHIPPING',  'Đang giao bởi GHN',                                         UTC_TIMESTAMP(6) - INTERVAL  48 HOUR),
(6, 'DELIVERED', 'Giao hàng thành công — bấm Mở hộp để xem sách bên trong',   UTC_TIMESTAMP(6) - INTERVAL  12 HOUR);

-- --------------------------------------------------------
-- SAN TRAO DOI SACH (EXCHANGE)
-- --------------------------------------------------------
INSERT INTO `exchange_listings` (`listing_id`, `owner_id`, `book_title`, `wanted`, `book_condition`, `location`, `cover_url`, `note`, `status`, `created_at`) VALUES
(1, 2, 'Mắt Biếc',                   'Dế Mèn Phiêu Lưu Ký',          'Mới 95%', 'Hà Nội',  'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&q=80', 'Sách đọc 1 lần, không gấp trang, bọc bìa kính.', 'OPEN', UTC_TIMESTAMP(6) - INTERVAL 120 HOUR),
(2, 4, 'Tuổi Trẻ Đáng Giá Bao Nhiêu','Sách kỹ năng mềm bất kỳ',      'Mới 90%', 'TP.HCM',  'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400&q=80', 'Có vài dòng highlight bằng bút nhớ.',           'OPEN', UTC_TIMESTAMP(6) - INTERVAL  96 HOUR),
(3, 3, 'Sapiens: Lược Sử Loài Người','Tư Duy Nhanh Và Chậm',         'Mới 99%', 'Đà Nẵng', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80', 'Bản bìa mềm, còn nguyên seal tem NXB.',         'OPEN', UTC_TIMESTAMP(6) - INTERVAL  60 HOUR),
(4, 1, 'Nhà Giả Kim',                'Tội Ác Và Hình Phạt',          'Mới 90%', 'Hà Nội',  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',   'Đọc xong một lần, sách còn thơm mùi giấy.',     'OPEN', UTC_TIMESTAMP(6) - INTERVAL  30 HOUR);

INSERT INTO `exchange_offers` (`listing_id`, `sender_id`, `offered_book`, `message`, `status`, `created_at`) VALUES
(4, 2, 'Tội Ác Và Hình Phạt',  'Chào bạn, mình có cuốn Tội Ác Và Hình Phạt bản NXB Văn Học, mới 95%. Đổi với mình nhé!', 'PENDING', UTC_TIMESTAMP(6) - INTERVAL 20 HOUR),
(3, 1, 'Tư Duy Nhanh Và Chậm', 'Mình có đúng cuốn bạn đang tìm, còn mới 90%. Bạn xem có hợp không nhé!',                 'PENDING', UTC_TIMESTAMP(6) - INTERVAL 10 HOUR);

-- --------------------------------------------------------
-- BAI DANG CONG DONG (POSTS)
-- --------------------------------------------------------
INSERT INTO `posts` (`post_id`, `user_id`, `page_id`, `club_id`, `book_id`, `content`, `media_url`, `visibility`, `created_at`) VALUES
(1, 1, NULL, NULL, 6, 'Đang đọc Atomic Habits và thấy thay đổi thật sự rõ ràng sau 30 ngày. Ai đang tìm cách xây dựng thói quen mới thì nên đọc ngay!', 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6', 'PUBLIC', UTC_TIMESTAMP(6) - INTERVAL 48 HOUR),
(2, 2, NULL, NULL, 4, 'Mắt Biếc là cuốn mình đọc đi đọc lại nhiều lần nhất. Văn Nguyễn Nhật Ánh nhẹ nhàng mà ám ảnh lạ kỳ.', NULL, 'PUBLIC', UTC_TIMESTAMP(6) - INTERVAL 36 HOUR),
(3, 3, NULL, NULL, 1, 'Nhà Giả Kim nhắc mình rằng hành trình quan trọng hơn đích đến. "Khi con thật sự mong muốn điều gì, cả vũ trụ sẽ chung sức giúp con."', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f', 'PUBLIC', UTC_TIMESTAMP(6) - INTERVAL 12 HOUR);

INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES
(1, 2, 'LOVE'),
(1, 3, 'BOOKWORM'),
(2, 1, 'LOVE'),
(2, 4, 'LIKE'),
(3, 1, 'INSIGHTFUL'),
(3, 2, 'LOVE');

INSERT INTO comments (comment_id, post_id, user_id, parent_comment_id, content, created_at) VALUES
(1, 1, 2, NULL, 'Cuốn này mình cũng đang đọc! Chương về Identity-based habits hay lắm.', UTC_TIMESTAMP() - INTERVAL 40 HOUR),
(2, 1, 1,    1, 'Đúng rồi, phần đó thay đổi cách mình nhìn hoàn toàn. Không phải "tôi muốn đọc sách" mà là "tôi là người đọc sách".', UTC_TIMESTAMP() - INTERVAL 38 HOUR),
(3, 2, 3, NULL, 'Đoạn kết làm mình khóc mấy lần rồi. Tác giả sao có thể viết buồn đến vậy.', UTC_TIMESTAMP() - INTERVAL 30 HOUR),
(4, 3, 4, NULL, 'Câu trích dẫn này hay quá, lưu lại ngay!', UTC_TIMESTAMP() - INTERVAL 10 HOUR);

-- --------------------------------------------------------
-- THONG BAO (NOTIFICATIONS)
-- --------------------------------------------------------
INSERT INTO `notifications` (`user_id`, `message`, `link`, `is_read`, `created_at`) VALUES
(1, 'Đơn hàng BKG240921 đã giao thành công. Mở hộp Blind Book xem bên trong có gì nhé!', '/orders/6',           FALSE, UTC_TIMESTAMP(6) - INTERVAL 12 HOUR),
(1, 'Nguyễn Hoàng Nam muốn đổi "Tội Ác Và Hình Phạt" lấy "Nhà Giả Kim" của bạn.',        '/exchange?tab=mine', FALSE, UTC_TIMESTAMP(6) - INTERVAL 20 HOUR),
(3, 'Trần Đức Anh muốn đổi "Tư Duy Nhanh Và Chậm" lấy "Sapiens" của bạn.',              '/exchange?tab=mine', FALSE, UTC_TIMESTAMP(6) - INTERVAL 10 HOUR),
(6, 'Bạn có đơn hàng mới BKG240922 đang chờ xác nhận.',                                  '/shop-admin',        FALSE, UTC_TIMESTAMP(6) - INTERVAL 48 HOUR),
(7, 'Sản phẩm mới "AI Và Tương Lai Loài Người" của Fahasa Official đang chờ duyệt.',     '/admin',             FALSE, UTC_TIMESTAMP(6) - INTERVAL 48 HOUR);

-- --------------------------------------------------------
-- GAMIFICATION
-- --------------------------------------------------------
INSERT INTO user_activities (user_id, activity_type, points_awarded, created_at) VALUES
(1, 'READ_CHAPTER', 20, UTC_TIMESTAMP() - INTERVAL 2 DAY),
(1, 'CREATE_POST',  50, UTC_TIMESTAMP() - INTERVAL 2 DAY),
(2, 'CREATE_POST',  50, UTC_TIMESTAMP() - INTERVAL 1 DAY),
(3, 'WRITE_REVIEW', 40, UTC_TIMESTAMP() - INTERVAL 18 HOUR),
(1, 'LOGIN_STREAK', 10, UTC_TIMESTAMP() - INTERVAL 6 HOUR);

-- --------------------------------------------------------
-- BAO CAO VI PHAM
-- --------------------------------------------------------
INSERT INTO reports (report_id, reporter_id, target_type, target_id, reason, status, resolved_by, created_at) VALUES
(1, 2, 'POST', 1, 'Bài viết có nội dung spam, đăng lại nhiều lần.', 'PENDING', NULL, UTC_TIMESTAMP() - INTERVAL 5 HOUR);
