DROP DATABASE IF EXISTS `Bookigma`;

-- 1. Tao database va chon database lam viec
CREATE DATABASE IF NOT EXISTS Bookigma CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE Bookigma;

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

    `role` ENUM('USER', 'MODERATOR', 'ADMIN')
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
(1, 'Goi Mien Phi (Standard Free)',          0.00,    3650, 'Doc cac dau sach kinh dien cong dong, tham gia thao luan nhom.', 3),
(2, 'Goi Mot Sach Thang (Bookworm Monthly)', 59000.00,  30, 'Doc toan bo kho sach VIP khong gioi han, khong co quang cao trong 30 ngay.', NULL),
(3, 'Goi Mot Sach Quy (Bookworm Quarterly)', 159000.00, 90, 'Tiet kiem 10%, mo khoa toan bo sach VIP va huy hieu doc quyen.', NULL),
(4, 'Goi Hoc Gia Nam (Scholar Yearly)',      599000.00, 365,'Doc sach VIP khong gioi han ca nam, giam gia 10% khi mua sach giay.', NULL);

-- --------------------------------------------------------
-- TAI KHOAN NGUOI DUNG
-- --------------------------------------------------------
INSERT INTO `users` (`user_id`, `username`, `email`, `password_hash`, `full_name`, `avatar_url`, `bio`, `role`, `is_active`, `created_at`) VALUES
(1, 'ducanh',   'user@bookigma.vn',   '$2a$10$KsgnH9AMOcdtNizkcggv2.4NCnNKXmFUofpIRi0jLfpXa.KQNtcSW', 'Tran Duc Anh',     'https://i.pravatar.cc/150?img=12', 'Sinh vien nam 3, thich sach ky nang va truyen cam hung.', 'USER',  TRUE, UTC_TIMESTAMP(6) - INTERVAL 258 DAY),
(2, 'hoangnam', 'nam@bookigma.vn',    '$2a$10$HmOcA4ZYbXnuc0/f1BGm4eEzENpIPNDb4n.BYiqVg8LwXkWvnQ0Pa', 'Nguyen Hoang Nam', 'https://i.pravatar.cc/150?img=33', 'Me van hoc Viet Nam.', 'USER',  TRUE, UTC_TIMESTAMP(6) - INTERVAL 239 DAY),
(3, 'lethao',   'thao@bookigma.vn',   '$2a$10$qyCjZY4tVzXy2LV7MuSoEOAO0SeRMcxWomhgvvPy84mpCVaX.PP32', 'Le Thao',          'https://i.pravatar.cc/150?img=47', 'Review sach moi tuan.', 'USER',  TRUE, UTC_TIMESTAMP(6) - INTERVAL 221 DAY),
(4, 'lananh',   'lananh@bookigma.vn', '$2a$10$EJAXBcJyHMrUt6YDmEBr6u78C1.Adp4x35RnYoz66LM0rRWtm7mKi', 'Vu Lan Anh',       'https://i.pravatar.cc/150?img=45', 'Thich sach thieu nhi.', 'USER',  TRUE, UTC_TIMESTAMP(6) - INTERVAL 195 DAY),
(5, 'fahasa',   'shop@bookigma.vn',   '$2a$10$xLSIdddmYOofK6IBrVnh/OqDcNmjMhsZ/NKbdsgXhH8zzu2d5qwaO', 'Fahasa Official',  'https://i.pravatar.cc/150?img=68', 'Nha sach chinh hang.', 'SHOP',  TRUE, UTC_TIMESTAMP(6) - INTERVAL 332 DAY),
(6, 'nxbtre',   'nxbtre@bookigma.vn', '$2a$10$6AUN.I1gZmYaE9KFoN2xFuRie0L71HxoVjI4r5GviHmaeAB.ZCtGq', 'NXB Tre',          'https://i.pravatar.cc/150?img=3',  'Nha xuat ban Tre.', 'SHOP',  TRUE, UTC_TIMESTAMP(6) - INTERVAL 293 DAY),
(7, 'admin',    'admin@bookigma.vn',  '$2a$10$O/UVsIoGUgAT7eORD/IJlOILDv0qaTnSq2lDQ/h7IDcPZBMLocWDG', 'Quan tri vien',    'https://i.pravatar.cc/150?img=59', NULL, 'ADMIN', TRUE, UTC_TIMESTAMP(6) - INTERVAL 363 DAY);

INSERT INTO user_points (user_id, total_points, monthly_points, current_tier) VALUES
(1, 820,  240, 'Hoc Gia Bac'),
(2, 450,  120, 'Ho Ve Sach'),
(3, 310,   90, 'Tap Su'),
(4, 180,   50, 'Tap Su'),
(5, 0,     0,  'Quan Tri'),
(6, 0,     0,  'Quan Tri'),
(7, 0,     0,  'Quan Tri');

INSERT INTO user_subscriptions (user_id, plan_id, start_date, end_date, status) VALUES
(1, 4, UTC_TIMESTAMP() - INTERVAL 30  DAY, UTC_TIMESTAMP() + INTERVAL 335  DAY, 'ACTIVE'),
(2, 2, UTC_TIMESTAMP() - INTERVAL 10  DAY, UTC_TIMESTAMP() + INTERVAL 20   DAY, 'ACTIVE'),
(3, 1, UTC_TIMESTAMP() - INTERVAL 60  DAY, UTC_TIMESTAMP() + INTERVAL 3000 DAY, 'ACTIVE'),
(4, 1, UTC_TIMESTAMP() - INTERVAL 15  DAY, UTC_TIMESTAMP() + INTERVAL 3000 DAY, 'ACTIVE');

-- --------------------------------------------------------
-- SHOP
-- --------------------------------------------------------
INSERT INTO `shops` (`shop_id`, `owner_id`, `name`, `description`, `avatar_url`, `rating`, `follower_count`, `is_verified`, `created_at`) VALUES
(1, 5, 'Fahasa Official', 'Nha sach Fahasa - sach chinh hang, giao hang toan quoc.',  'https://i.pravatar.cc/150?img=68', 4.8, 12400, TRUE, UTC_TIMESTAMP(6) - INTERVAL 332 DAY),
(2, 6, 'NXB Tre',         'Nha xuat ban Tre - kho sach van hoc va thieu nhi.',        'https://i.pravatar.cc/150?img=3',  4.9,  8600, TRUE, UTC_TIMESTAMP(6) - INTERVAL 293 DAY);

-- --------------------------------------------------------
-- THE LOAI & TAC GIA
-- --------------------------------------------------------
INSERT INTO categories (category_id, name, slug) VALUES
(1, 'Truyen cam hung',     'truyen-cam-hung'),
(2, 'Tam ly - Ky nang',    'tam-ly-ky-nang'),
(3, 'Van hoc Viet Nam',    'van-hoc-viet-nam'),
(4, 'Van hoc nuoc ngoai',  'van-hoc-nuoc-ngoai'),
(5, 'Khoa hoc - Cong nghe','khoa-hoc-cong-nghe'),
(6, 'Kinh te',             'kinh-te'),
(7, 'Thieu nhi',           'thieu-nhi');

INSERT INTO authors (author_id, name) VALUES
(1,  'Paulo Coelho'),
(2,  'Daniel Kahneman'),
(3,  'Dale Carnegie'),
(4,  'Nguyen Nhat Anh'),
(5,  'Yuval Noah Harari'),
(6,  'James Clear'),
(7,  'Nguyen Phong'),
(8,  'Rosie Nguyen'),
(9,  'Fyodor Dostoevsky'),
(10, 'Kai-Fu Lee'),
(11, 'To Hoai'),
(12, 'Jose Mauro de Vasconcelos');

-- --------------------------------------------------------
-- KHO SACH
-- tags: cach nhau bang dau phay, khop voi StringListConverter cua backend
-- BlindBoxMood.MOTIVATION -> categories: Truyen cam hung, Tam ly - Ky nang
--                         -> tags: uoc mo, hanh trinh, thoi quen, phat trien ban than, tuoi tre
-- BlindBoxMood.CRY        -> categories: Van hoc Viet Nam, Van hoc nuoc ngoai
--                         -> tags: buon, cam dong, tuoi tho, tinh yeu, gia dinh
-- BlindBoxMood.SKILL      -> categories: Tam ly - Ky nang, Kinh te
--                         -> tags: ky nang mem, giao tiep, nang suat, ra quyet dinh, thoi quen
-- BlindBoxMood.ESCAPE     -> categories: Van hoc nuoc ngoai, Thieu nhi, Van hoc Viet Nam
--                         -> tags: phieu luu, kinh dien, hanh trinh, tam linh
-- BlindBoxMood.CURIOUS    -> categories: Khoa hoc - Cong nghe
--                         -> tags: khoa hoc, lich su, cong nghe, xa hoi, tien hoa
-- --------------------------------------------------------
INSERT INTO `books` (`book_id`, `shop_id`, `title`, `author_id`, `category_id`, `description`, `cover_image_url`, `page_count`, `tags`, `is_digital`, `is_for_sale`, `sale_price`, `original_price`, `stock_quantity`, `sold_count`, `rating_avg`, `rating_count`, `status`, `created_at`) VALUES
(1,  1, 'Nha Gia Kim',                     1,  1, 'Cau chuyen ve cau be chan cuu Santiago di tim kho bau va kham pha ra van menh cua chinh minh.',                   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',  228, 'triet ly,hanh trinh,uoc mo,tam linh',           TRUE, TRUE,  79000,  99000, 148, 5120, 4.9, 2418, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL 120 DAY),
(2,  2, 'Tu Duy Nhanh Va Cham',            2,  2, 'Giai Nobel Kinh te Daniel Kahneman giai thich hai he thong chi phoi cach chung ta suy nghi.',                    'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80', 542, 'tam ly hoc,ra quyet dinh,hanh vi,khoa hoc',    TRUE, TRUE, 145000, 189000,  62, 2340, 4.8, 1180, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL 115 DAY),
(3,  1, 'Dac Nhan Tam',                    3,  2, 'Cuon sach kinh dien ve nghe thuat giao tiep va ung xu, giup xay dung moi quan he ben vung.',                     'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',  320, 'giao tiep,ky nang mem,quan he',                 TRUE, TRUE,  89000, 110000, 320, 8800, 4.7, 3902, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL 110 DAY),
(4,  2, 'Mat Biec',                        4,  3, 'Cau chuyen tinh don phuong day dut cua Ngan danh cho Ha Lan, trai dai tu lang Do Do toi thanh pho.',             'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&q=80',  268, 'tinh yeu,tuoi tho,lang que,buon',               TRUE, TRUE,  95000, 120000,  95, 6400, 4.9, 2760, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL 105 DAY),
(5,  1, 'Sapiens: Luoc Su Loai Nguoi',     5,  5, 'Hanh trinh 70.000 nam cua loai Homo sapiens, tu nhung bay nguoi san bat hai luom den chu nhan cua hanh tinh.',  'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80',  554, 'lich su,tien hoa,xa hoi,khoa hoc',              TRUE, TRUE, 199000, 259000,  48, 3100, 4.8, 1540, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL 100 DAY),
(6,  1, 'Atomic Habits - Thay Doi Ti Hon', 6,  2, 'Phuong phap da duoc chung minh de xay dung thoi quen tot bang nhung thay doi 1% moi ngay.',                    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80',   320, 'thoi quen,nang suat,phat trien ban than',       TRUE, TRUE, 139000, 169000, 210, 4500, 4.9, 2210, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL  95 DAY),
(7,  2, 'Muon Kiep Nhan Sinh',             7,  1, 'Nhung cau chuyen ve luan hoi, nhan qua va y nghia sau xa cua kiep nguoi qua loi ke cua Thomas.',               'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80',  398, 'tam linh,triet ly,nhan qua,hanh trinh',         TRUE, TRUE, 129000, 158000,  76, 3900, 4.7, 1890, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL  90 DAY),
(8,  2, 'Tuoi Tre Dang Gia Bao Nhieu',     8,  1, 'Cuon sach goi dau giuong cua nguoi tre Viet ve hoc, lam va di.',                                               'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400&q=80',  285, 'tuoi tre,phat trien ban than,du lich',          TRUE, TRUE,  75000,  90000, 130, 2800, 4.5, 1420, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL  85 DAY),
(9,  1, 'Toi Ac Va Hinh Phat',             9,  4, 'Kiet tac tam ly ve toi loi, su dan vat va con duong cuu chuoc cua Raskolnikov.',                                'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&q=80',  671, 'kinh dien,tam ly,triet ly,Nga',                 TRUE, TRUE, 165000, 199000,  34, 1200, 4.6,  880, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL  80 DAY),
(10, 1, 'AI Va Tuong Lai Loai Nguoi',     10,  5, 'Cuoc dua AI giua My va Trung Quoc va nhung gi no co nghia voi cong viec, xa hoi va y nghia cuoc song.',        'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&q=80',  412, 'cong nghe,AI,tuong lai,kinh te',                TRUE, TRUE, 189000, 229000,  55,  980, 4.6,  640, 'PENDING', UTC_TIMESTAMP(6) - INTERVAL   2 DAY),
(11, 2, 'De Men Phieu Luu Ky',            11,  7, 'Cuoc phieu luu kinh dien cua chu De Men, tac pham thieu nhi duoc yeu thich nhat Viet Nam.',                    'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&q=80',  168, 'thieu nhi,phieu luu,kinh dien,Viet Nam',        TRUE, TRUE,  58000,  72000, 240, 5600, 4.8, 1980, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL  70 DAY),
(12, 2, 'Cay Cam Ngot Cua Toi',           12,  4, 'Cau chuyen cam dong ve cau be Zeze va cay cam ngot - nguoi ban tuong tuong cua em.',                           'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400&q=80',  244, 'tuoi tho,cam dong,gia dinh,buon',               TRUE, TRUE, 108000, 128000,  88, 7200, 4.9, 3100, 'ACTIVE',  UTC_TIMESTAMP(6) - INTERVAL  65 DAY);

-- --------------------------------------------------------
-- NOI DUNG DOC THU (BOOK CHAPTERS)
-- --------------------------------------------------------
INSERT INTO book_chapters (book_id, chapter_index, title, content_text) VALUES
(1, 1, 'Chuong 1: Tieng goi tu vu tru',
 'Cau ten la Santiago. Troi da chap toi khi cau cung dan cuu den mot nha tho co sup do, mai da sap tu lau va mot cay chan lon da moc len ngay noi xua la phong thanh.\n\nCau quyet dinh ngu lai day qua dem. Khi cau thuc giac thi troi hay con toi. Nhin len, cau thay cac vi sao lap lanh qua mai nha thung. Cau vua mo dung giac mo tuan truoc va lai tinh day truoc khi giac mo cham dut.'),
(1, 2, 'Chuong 2: Ong vua gia xu Salem',
 'Ong gia mac ao choang ngoi xuong canh cau. Ong noi rang ong la Melchizedek, vua xu Salem.\n\n"Van menh la dieu ma con hang mong muon thuc hien," ong noi. "Ai cung biet duoc van menh cua minh khi con tre."\n\n"Khi con that su mong muon dieu gi, ca vu tru se chung suc giup con dat duoc dieu ay," ong vua noi, roi bien mat vao anh nang ban trua.'),
(1, 3, 'Chuong 3: Sa mac va bai hoc cua gio',
 'Doan lu hanh di vao sa mac. Cat trai dai den tan chan troi, va moi ngay Santiago lai hoc duoc mot dieu moi tu su im lang menh mong ay.\n\nNguoi luyen kim dan noi: "Sa mac se day con tat ca, nhung no doi hoi con phai lang nghe. Con phai hoc ngon ngu ma moi vat tren doi deu noi chung."'),
(2, 1, 'Chuong 1: Hai he thong',
 'He thong 1 hoat dong tu dong va nhanh chong, hau nhu khong can no luc va khong co cam giac ve su kiem soat co chu y.\n\nHe thong 2 phan bo su chu y cho cac hoat dong tinh than doi hoi no luc. Khi chung ta nghi ve ban than minh, ta dong nhat voi He thong 2 - nhung phan lon quyet dinh trong ngay lai do He thong 1 am tham dua ra.'),
(2, 2, 'Chuong 2: Su chu y va no luc',
 'He thong 2 co kha nang han che. Khi ban dang ban ron voi mot viec doi hoi no luc, ban gan nhu mu truoc nhung gi dang xay ra xung quanh.\n\nThi nghiem "con khi vo hinh" cho thay khi tap trung dem so lan chuyen bong, mot nua so nguoi xem hoan toan khong nhin thay nguoi mac do khi di ngang qua man hinh.'),
(3, 1, 'Chuong 1: Muon lay mat dung pha to ong',
 'Ngay 7 thang 5 nam 1931, thanh pho New York chung kien cuoc vay bat toi pham gay can nhat trong lich su. "Hai Khau Sung" Crowley bi bao vay tren can ho o dai lo West End.\n\nBai hoc: chi trich la vo ich, boi no khien nguoi ta phai phong thu va thuong lam ho co suc bien minh cho minh.'),
(4, 1, 'Chuong 1: Lang Do Do',
 'Toi sinh ra o lang Do Do. Lang toi nho, nho den muc chi can dung o dau lang goi to mot tieng la cuoi lang da nghe.\n\nHa Lan co doi mat rat dep. Mat to, tron va den lay. Nhung cai dep cua doi mat ay khong nam o hinh dang ma nam o cai nhin - mot cai nhin khien nguoi ta thay minh vua duoc che cho vua bi bo roi.'),
(5, 1, 'Chuong 1: Mot loai vat chang co gi dac biet',
 'Khoang 13,5 ty nam truoc, vat chat, nang luong, thoi gian va khong gian ra doi trong su kien goi la Vu No Lon.\n\nHomo sapiens xuat hien o Dong Phi khoang 200.000 nam truoc. Trong phan lon lich su, chung ta la mot loai vat tam thuong, dung giua chuoi thuc an.'),
(6, 1, 'Chuong 1: Suc manh dang kinh ngac cua thoi quen nguyen tu',
 'Neu ban tot hon 1% moi ngay trong mot nam, cuoi cung ban se tot hon 37 lan. Nguoc lai, neu te di 1% moi ngay, ban gan nhu tro ve con so 0.\n\nThoi quen la lai kep cua su tu cai thien. Chung co ve nho be va vo nghia o thoi diem hien tai, nhung qua nhieu thang nam chung tao ra khac biet khong lo.'),
(7, 1, 'Chuong 1: Cuoc gap go dinh menh',
 'Thomas la mot nha tai chinh thanh dat o New York. Nhung dang sau su thanh cong ay la nhung giac mo lap di lap lai ve mot kiep song khac, o mot vung dat khac.\n\nOng ke: "Toi thay minh dung giua den Karnak, mac ao tu si, va biet ro tung vien da o do - du doi nay toi chua tung dat chan den Ai Cap."'),
(8, 1, 'Chuong 1: Hoc',
 'Toi tin rang thu tai san lon nhat cua tuoi tre khong phai la thoi gian, ma la kha nang hoc hoi nhanh hon bat ky giai doan nao khac cua doi nguoi.\n\nMoi cuon sach ban doc la mot cuoc doi thoai voi nguoi thong minh nhat trong linh vuc do, voi gia re hon mot bua an.'),
(9, 1, 'Chuong 1: Can gac xep',
 'Vao mot buoi chieu nong nuc dau thang Bay, mot chang trai tre buoc ra khoi can gac xep thue lai o ngo S., cham rai va nhu con luong lu, di ve phia cau K.\n\nChang da mac no ba chu nha va so gap ba ta. Khong phai vi chang nhut nhat - ma vi tu lau chang da roi vao trang thai cang thang va cau ban giong nhu chung nghi benh.'),
(10, 1, 'Chuong 1: Khoanh khac Sputnik cua Trung Quoc',
 'Thang 5 nam 2017, AlphaGo danh bai Kha Khiet - ky thu co vay so mot the gioi. Voi phuong Tay do la mot tin cong nghe. Voi Trung Quoc, do la khoanh khac Sputnik.'),
(11, 1, 'Chuong 1: Toi song doc lap tu thuo be',
 'Toi song doc lap tu thuo be. Ay la tuc le lau doi trong ho nha de chung toi. Va lai, me thuong bao chung toi rang: "Phai nhu the de cac con biet kiem an mot minh cho quen di."'),
(12, 1, 'Chuong 1: Nguoi kham pha ra moi thu',
 'Chung toi nam tay nhau di doc pho. Totoca chang voi gi. Anh day toi biet cuoc song la the nao. Va dieu do khien toi rat hai long, vi anh toi la nguoi kham pha ra moi thu.');

-- --------------------------------------------------------
-- MA GIAM GIA (VOUCHERS)
-- --------------------------------------------------------
INSERT INTO `vouchers` (`code`, `label`, `discount_type`, `discount_value`, `max_discount`, `min_order_amount`, `is_active`) VALUES
('BOOKIGMA10', 'Giam 10% toi da 30.000d',          'PERCENT', 10.00,    30000.00, 100000.00, TRUE),
('FREESHIP',   'Mien phi van chuyen',               'SHIPPING', 0.00,      NULL,  150000.00, TRUE),
('GIAM50K',    'Giam 50.000d cho don tu 300.000d',  'AMOUNT',  50000.00,  NULL,   300000.00, TRUE);

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
(1, 'BKG240915', 1, 1, 'Tran Duc Anh',    '0901234567', '12 Nguyen Trai, Thanh Xuan, Ha Noi',     NULL,                    'COD',  NULL,         89000.00, 25000.00,     0.00, 114000.00, 'COMPLETED', UTC_TIMESTAMP(6) - INTERVAL 288 HOUR, UTC_TIMESTAMP(6) - INTERVAL 192 HOUR),
(2, 'BKG240920', 1, 1, 'Tran Duc Anh',    '0901234567', '12 Nguyen Trai, Thanh Xuan, Ha Noi',     NULL,                    'BANK', 'BOOKIGMA10',297000.00, 25000.00, 29700.00, 292300.00, 'SHIPPING',  UTC_TIMESTAMP(6) - INTERVAL  96 HOUR, UTC_TIMESTAMP(6) - INTERVAL  48 HOUR),
(3, 'BKG240922', 3, 2, 'Le Thao',         '0912345678', '45 Le Loi, Quan 1, TP.HCM',              NULL,                    'MOMO', NULL,        108000.00, 25000.00,     0.00, 133000.00, 'PENDING',   UTC_TIMESTAMP(6) - INTERVAL  48 HOUR, NULL),
(4, 'BKG240918', 4, 2, 'Vu Lan Anh',      '0987654321', '88 Tran Phu, Hai Chau, Da Nang',         'Goi qua giup minh nhe', 'COD',  'FREESHIP',  174000.00,     0.00,     0.00, 174000.00, 'CONFIRMED', UTC_TIMESTAMP(6) - INTERVAL 144 HOUR, UTC_TIMESTAMP(6) - INTERVAL 132 HOUR),
(5, 'BKG240910', 2, 1, 'Nguyen Hoang Nam','0933222111', '7 Cau Giay, Ha Noi',                     NULL,                    'COD',  NULL,        199000.00, 25000.00,     0.00, 224000.00, 'CANCELLED', UTC_TIMESTAMP(6) - INTERVAL 360 HOUR, UTC_TIMESTAMP(6) - INTERVAL 336 HOUR),
(6, 'BKG240921', 1, 2, 'Tran Duc Anh',    '0901234567', '12 Nguyen Trai, Thanh Xuan, Ha Noi',     NULL,                    'MOMO', NULL,        150000.00, 25000.00,     0.00, 175000.00, 'DELIVERED', UTC_TIMESTAMP(6) - INTERVAL  72 HOUR, UTC_TIMESTAMP(6) - INTERVAL  12 HOUR);

INSERT INTO `order_items` (`order_id`, `book_id`, `blind_box_id`, `book_title`, `cover_image_url`, `quantity`, `unit_price`) VALUES
(1, 3,  NULL, 'Dac Nhan Tam',                  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80', 1,  89000.00),
(2, 6,  NULL, 'Atomic Habits - Thay Doi Ti Hon','https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80', 1, 139000.00),
(2, 1,  NULL, 'Nha Gia Kim',                   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',  2,  79000.00),
(3, 12, NULL, 'Cay Cam Ngot Cua Toi',           'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400&q=80', 1, 108000.00),
(4, 11, NULL, 'De Men Phieu Luu Ky',            'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&q=80', 3,  58000.00),
(5, 5,  NULL, 'Sapiens: Luoc Su Loai Nguoi',    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80', 1, 199000.00),
(6, 7,  1,    'Muon Kiep Nhan Sinh',             'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80', 1, 150000.00);

INSERT INTO `order_status_history` (`order_id`, `status`, `note`, `created_at`) VALUES
(1, 'PENDING',   'Don hang duoc tao',                                         UTC_TIMESTAMP(6) - INTERVAL 288 HOUR),
(1, 'CONFIRMED', 'Shop xac nhan don hang',                                    UTC_TIMESTAMP(6) - INTERVAL 283 HOUR),
(1, 'SHIPPING',  'Dang giao boi GHTK',                                        UTC_TIMESTAMP(6) - INTERVAL 264 HOUR),
(1, 'DELIVERED', 'Giao hang thanh cong',                                      UTC_TIMESTAMP(6) - INTERVAL 216 HOUR),
(1, 'COMPLETED', 'Khach xac nhan da nhan hang',                               UTC_TIMESTAMP(6) - INTERVAL 192 HOUR),
(2, 'PENDING',   'Don hang duoc tao',                                         UTC_TIMESTAMP(6) - INTERVAL  96 HOUR),
(2, 'CONFIRMED', 'Shop xac nhan don hang',                                    UTC_TIMESTAMP(6) - INTERVAL  86 HOUR),
(2, 'SHIPPING',  'Dang giao boi GHN',                                         UTC_TIMESTAMP(6) - INTERVAL  48 HOUR),
(3, 'PENDING',   'Don hang duoc tao',                                         UTC_TIMESTAMP(6) - INTERVAL  48 HOUR),
(4, 'PENDING',   'Don hang duoc tao',                                         UTC_TIMESTAMP(6) - INTERVAL 144 HOUR),
(4, 'CONFIRMED', 'Shop xac nhan don hang',                                    UTC_TIMESTAMP(6) - INTERVAL 132 HOUR),
(5, 'PENDING',   'Don hang duoc tao',                                         UTC_TIMESTAMP(6) - INTERVAL 360 HOUR),
(5, 'CANCELLED', 'Khach huy: dat nham so luong',                              UTC_TIMESTAMP(6) - INTERVAL 336 HOUR),
(6, 'PENDING',   'Don hang duoc tao',                                         UTC_TIMESTAMP(6) - INTERVAL  72 HOUR),
(6, 'CONFIRMED', 'Shop xac nhan don hang',                                    UTC_TIMESTAMP(6) - INTERVAL  67 HOUR),
(6, 'SHIPPING',  'Dang giao boi GHN',                                         UTC_TIMESTAMP(6) - INTERVAL  48 HOUR),
(6, 'DELIVERED', 'Giao hang thanh cong - bam Mo hop de xem sach ben trong',   UTC_TIMESTAMP(6) - INTERVAL  12 HOUR);

-- --------------------------------------------------------
-- SAN TRAO DOI SACH (EXCHANGE)
-- --------------------------------------------------------
INSERT INTO `exchange_listings` (`listing_id`, `owner_id`, `book_title`, `wanted`, `book_condition`, `location`, `cover_url`, `note`, `status`, `created_at`) VALUES
(1, 2, 'Mat Biec',                   'De Men Phieu Luu Ky',          'Moi 95%', 'Ha Noi',  'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&q=80', 'Sach doc 1 lan, khong gap trang, boc bia kinh.', 'OPEN', UTC_TIMESTAMP(6) - INTERVAL 120 HOUR),
(2, 4, 'Tuoi Tre Dang Gia Bao Nhieu','Sach ky nang mem bat ky',      'Moi 90%', 'TP.HCM',  'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400&q=80', 'Co vai dong highlight bang but nho.',           'OPEN', UTC_TIMESTAMP(6) - INTERVAL  96 HOUR),
(3, 3, 'Sapiens: Luoc Su Loai Nguoi','Tu Duy Nhanh Va Cham',         'Moi 99%', 'Da Nang', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80', 'Ban bia mem, con nguyen seal tem NXB.',         'OPEN', UTC_TIMESTAMP(6) - INTERVAL  60 HOUR),
(4, 1, 'Nha Gia Kim',                'Toi Ac Va Hinh Phat',          'Moi 90%', 'Ha Noi',  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',   'Doc xong mot lan, sach con thom mui giay.',     'OPEN', UTC_TIMESTAMP(6) - INTERVAL  30 HOUR);

INSERT INTO `exchange_offers` (`listing_id`, `sender_id`, `offered_book`, `message`, `status`, `created_at`) VALUES
(4, 2, 'Toi Ac Va Hinh Phat',  'Chao ban, minh co cuon Toi Ac Va Hinh Phat ban NXB Van Hoc, moi 95%. Doi voi minh nhe!', 'PENDING', UTC_TIMESTAMP(6) - INTERVAL 20 HOUR),
(3, 1, 'Tu Duy Nhanh Va Cham', 'Minh co dung cuon ban dang tim, con moi 90%. Ban xem co hop khong nhe!',                 'PENDING', UTC_TIMESTAMP(6) - INTERVAL 10 HOUR);

-- --------------------------------------------------------
-- BAI DANG CONG DONG (POSTS)
-- --------------------------------------------------------
INSERT INTO `posts` (`post_id`, `user_id`, `page_id`, `club_id`, `book_id`, `content`, `media_url`, `visibility`, `created_at`) VALUES
(1, 1, NULL, NULL, 6, 'Dang doc Atomic Habits va thay thay doi that su ro rang sau 30 ngay. Ai dang tim cach xay dung thoi quen moi thi nen doc ngay!', 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6', 'PUBLIC', UTC_TIMESTAMP(6) - INTERVAL 48 HOUR),
(2, 2, NULL, NULL, 4, 'Mat Biec la cuon minh doc di doc lai nhieu lan nhat. Van Nguyen Nhat Anh nhe nhang ma am anh la ky.', NULL, 'PUBLIC', UTC_TIMESTAMP(6) - INTERVAL 36 HOUR),
(3, 3, NULL, NULL, 1, 'Nha Gia Kim nhac minh rang hanh trinh quan trong hon dich den. "Khi con that su mong muon dieu gi, ca vu tru se chung suc giup con."', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f', 'PUBLIC', UTC_TIMESTAMP(6) - INTERVAL 12 HOUR);

INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES
(1, 2, 'LOVE'),
(1, 3, 'BOOKWORM'),
(2, 1, 'LOVE'),
(2, 4, 'LIKE'),
(3, 1, 'INSIGHTFUL'),
(3, 2, 'LOVE');

INSERT INTO comments (comment_id, post_id, user_id, parent_comment_id, content, created_at) VALUES
(1, 1, 2, NULL, 'Cuon nay minh cung dang doc! Chuong ve Identity-based habits hay lam.', UTC_TIMESTAMP() - INTERVAL 40 HOUR),
(2, 1, 1,    1, 'Dung roi, phan do thay doi cach minh nhin hoan toan. Khong phai "toi muon doc sach" ma la "toi la nguoi doc sach".', UTC_TIMESTAMP() - INTERVAL 38 HOUR),
(3, 2, 3, NULL, 'Doan ket lam minh khoc may lan roi. Tac gia sao co the viet buon den vay.', UTC_TIMESTAMP() - INTERVAL 30 HOUR),
(4, 3, 4, NULL, 'Cau trich dan nay hay qua, luu lai ngay!', UTC_TIMESTAMP() - INTERVAL 10 HOUR);

-- --------------------------------------------------------
-- THONG BAO (NOTIFICATIONS)
-- --------------------------------------------------------
INSERT INTO `notifications` (`user_id`, `message`, `link`, `is_read`, `created_at`) VALUES
(1, 'Don hang BKG240921 da giao thanh cong. Mo hop Blind Book xem ben trong co gi nhe!', '/orders/6',           FALSE, UTC_TIMESTAMP(6) - INTERVAL 12 HOUR),
(1, 'Nguyen Hoang Nam muon doi "Toi Ac Va Hinh Phat" lay "Nha Gia Kim" cua ban.',        '/exchange?tab=mine', FALSE, UTC_TIMESTAMP(6) - INTERVAL 20 HOUR),
(3, 'Tran Duc Anh muon doi "Tu Duy Nhanh Va Cham" lay "Sapiens" cua ban.',              '/exchange?tab=mine', FALSE, UTC_TIMESTAMP(6) - INTERVAL 10 HOUR),
(6, 'Ban co don hang moi BKG240922 dang cho xac nhan.',                                  '/shop-admin',        FALSE, UTC_TIMESTAMP(6) - INTERVAL 48 HOUR),
(7, 'San pham moi "AI Va Tuong Lai Loai Nguoi" cua Fahasa Official dang cho duyet.',     '/admin',             FALSE, UTC_TIMESTAMP(6) - INTERVAL 48 HOUR);

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
(1, 2, 'POST', 1, 'Bai viet co noi dung spam, dang lai nhieu lan.', 'PENDING', NULL, UTC_TIMESTAMP() - INTERVAL 5 HOUR);
