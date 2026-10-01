DROP DATABASE IF EXISTS `Bookigma`;

-- ========================================================
-- 1. TẠO DATABASE
-- ========================================================

CREATE DATABASE IF NOT EXISTS `Bookigma`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `Bookigma`;

SET NAMES utf8mb4;

-- ========================================================
-- 2. TÀI KHOẢN & GÓI THÀNH VIÊN
-- ========================================================

CREATE TABLE `subscription_plans` (
    `plan_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `duration_days` INT NOT NULL,
    `description` TEXT,
    `max_reading_limit` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `users` (
    `user_id` BIGINT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NULL,
    `avatar_url` VARCHAR(255) NULL,
    `bio` TEXT NULL,

    `role` ENUM(
        'USER',
        'SHOP',
        'MODERATOR',
        'ADMIN'
    ) NOT NULL DEFAULT 'USER',

    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`user_id`),

    UNIQUE KEY `uk_users_username` (`username`),
    UNIQUE KEY `uk_users_email` (`email`),

    KEY `idx_users_role` (`role`),
    KEY `idx_users_active` (`is_active`)
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `user_subscriptions` (
    `sub_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `plan_id` INT NOT NULL,

    `start_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `end_date` TIMESTAMP NOT NULL,

    `status` ENUM(
        'ACTIVE',
        'EXPIRED',
        'CANCELLED'
    ) DEFAULT 'ACTIVE',

    FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE,

    FOREIGN KEY (`plan_id`)
        REFERENCES `subscription_plans`(`plan_id`)
);

-- ========================================================
-- 3. SHOP
-- ========================================================

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
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- 4. KHO SÁCH & ĐỌC ONLINE
-- ========================================================

CREATE TABLE `categories` (
    `category_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `slug` VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE `authors` (
    `author_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `bio` TEXT
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
        REFERENCES `shops`(`shop_id`)
        ON DELETE SET NULL,

    CONSTRAINT `fk_books_author`
        FOREIGN KEY (`author_id`)
        REFERENCES `authors`(`author_id`)
        ON DELETE SET NULL,

    CONSTRAINT `fk_books_category`
        FOREIGN KEY (`category_id`)
        REFERENCES `categories`(`category_id`)
        ON DELETE SET NULL
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `book_chapters` (
    `chapter_id` BIGINT AUTO_INCREMENT PRIMARY KEY,

    `book_id` BIGINT NOT NULL,

    `chapter_index` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,

    `content_url` VARCHAR(255),
    `content_text` LONGTEXT,

    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (`book_id`)
        REFERENCES `books`(`book_id`)
        ON DELETE CASCADE
);


CREATE TABLE `reading_progress` (
    `progress_id` BIGINT AUTO_INCREMENT PRIMARY KEY,

    `user_id` BIGINT NOT NULL,
    `book_id` BIGINT NOT NULL,

    `current_chapter_id` BIGINT NULL,

    `last_position` VARCHAR(50),

    `percent_completed` DECIMAL(5, 2) DEFAULT 0.00,

    `updated_at`
        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY `uq_user_book` (`user_id`, `book_id`),

    FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE,

    FOREIGN KEY (`book_id`)
        REFERENCES `books`(`book_id`)
        ON DELETE CASCADE,

    FOREIGN KEY (`current_chapter_id`)
        REFERENCES `book_chapters`(`chapter_id`)
        ON DELETE SET NULL
);

-- ========================================================
-- 5. FANPAGE & HỘI NHÓM
-- ========================================================

CREATE TABLE `pages` (
    `page_id` BIGINT AUTO_INCREMENT PRIMARY KEY,

    `owner_id` BIGINT NOT NULL,

    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(100) NOT NULL UNIQUE,

    `bio` TEXT,
    `avatar_url` VARCHAR(255),

    `is_verified` BOOLEAN DEFAULT FALSE,

    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (`owner_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
);


CREATE TABLE `page_admins` (
    `page_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,

    `role` ENUM(
        'OWNER',
        'EDITOR',
        'MODERATOR'
    ) DEFAULT 'EDITOR',

    `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`page_id`, `user_id`),

    FOREIGN KEY (`page_id`)
        REFERENCES `pages`(`page_id`)
        ON DELETE CASCADE,

    FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
);


CREATE TABLE `book_clubs` (
    `club_id` BIGINT AUTO_INCREMENT PRIMARY KEY,

    `name` VARCHAR(150) NOT NULL,
    `description` TEXT,

    `cover_url` VARCHAR(255),

    `owner_id` BIGINT NOT NULL,

    `is_private` BOOLEAN DEFAULT FALSE,

    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (`owner_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
);


CREATE TABLE `club_members` (
    `club_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,

    `role` ENUM(
        'OWNER',
        'ADMIN',
        'MODERATOR',
        'MEMBER'
    ) DEFAULT 'MEMBER',

    `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`club_id`, `user_id`),

    FOREIGN KEY (`club_id`)
        REFERENCES `book_clubs`(`club_id`)
        ON DELETE CASCADE,

    FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
);

-- ========================================================
-- 6. BÀI ĐĂNG, TƯƠNG TÁC & STORY
-- ========================================================

CREATE TABLE `posts` (
    `post_id` BIGINT NOT NULL AUTO_INCREMENT,

    `user_id` BIGINT NOT NULL,

    `page_id` BIGINT NULL,
    `club_id` BIGINT NULL,
    `book_id` BIGINT NULL,

    `content` TEXT NOT NULL,

    `media_url` VARCHAR(255) NULL,

    `visibility` ENUM(
        'PUBLIC',
        'FRIENDS',
        'CLUB_ONLY'
    ) NOT NULL DEFAULT 'PUBLIC',

    `created_at` DATETIME(6)
        NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`post_id`),

    KEY `idx_posts_user_id` (`user_id`),
    KEY `idx_posts_page_id` (`page_id`),
    KEY `idx_posts_club_id` (`club_id`),
    KEY `idx_posts_book_id` (`book_id`),
    KEY `idx_posts_created_at` (`created_at`),
    KEY `idx_posts_visibility` (`visibility`),

    CONSTRAINT `fk_posts_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_posts_page`
        FOREIGN KEY (`page_id`)
        REFERENCES `pages`(`page_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_posts_club`
        FOREIGN KEY (`club_id`)
        REFERENCES `book_clubs`(`club_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_posts_book`
        FOREIGN KEY (`book_id`)
        REFERENCES `books`(`book_id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `post_reactions` (
    `reaction_id` BIGINT AUTO_INCREMENT PRIMARY KEY,

    `post_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,

    `reaction_type` ENUM(
        'LIKE',
        'LOVE',
        'BOOKWORM',
        'INSIGHTFUL'
    ) DEFAULT 'LIKE',

    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY `uq_post_user` (`post_id`, `user_id`),

    FOREIGN KEY (`post_id`)
        REFERENCES `posts`(`post_id`)
        ON DELETE CASCADE,

    FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
);


CREATE TABLE `comments` (
    `comment_id` BIGINT AUTO_INCREMENT PRIMARY KEY,

    `post_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,

    `parent_comment_id` BIGINT DEFAULT NULL,

    `content` TEXT NOT NULL,

    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (`post_id`)
        REFERENCES `posts`(`post_id`)
        ON DELETE CASCADE,

    FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE,

    FOREIGN KEY (`parent_comment_id`)
        REFERENCES `comments`(`comment_id`)
        ON DELETE CASCADE
);


CREATE TABLE `stories` (
    `story_id` BIGINT AUTO_INCREMENT PRIMARY KEY,

    `user_id` BIGINT NOT NULL,

    `media_url` VARCHAR(255) NOT NULL,
    `caption` VARCHAR(255),

    `expires_at` TIMESTAMP NOT NULL,

    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
);


CREATE TABLE `story_views` (
    `story_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,

    `viewed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`story_id`, `user_id`),

    FOREIGN KEY (`story_id`)
        REFERENCES `stories`(`story_id`)
        ON DELETE CASCADE,

    FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
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
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- 7. MUA BÁN & TRAO ĐỔI SÁCH
-- ========================================================

CREATE TABLE `vouchers` (
    `voucher_id` INT NOT NULL AUTO_INCREMENT,

    `code` VARCHAR(30) NOT NULL,
    `label` VARCHAR(150) NOT NULL,

    `discount_type` VARCHAR(20) NOT NULL,

    `discount_value` DECIMAL(10, 2)
        NOT NULL DEFAULT 0.00,

    `max_discount` DECIMAL(10, 2) NULL,

    `min_order_amount` DECIMAL(10, 2)
        NOT NULL DEFAULT 0.00,

    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (`voucher_id`),

    UNIQUE KEY `uk_vouchers_code` (`code`)
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `blind_boxes` (
    `box_id` BIGINT NOT NULL AUTO_INCREMENT,

    `user_id` BIGINT NOT NULL,
    `book_id` BIGINT NOT NULL,

    `tier` VARCHAR(20) NOT NULL,
    `mood` VARCHAR(20) NOT NULL,

    `price` DECIMAL(10, 2) NOT NULL,

    `status` VARCHAR(20)
        NOT NULL DEFAULT 'DRAFT',

    `revealed_at` DATETIME(6) NULL,

    `created_at` DATETIME(6) NOT NULL,

    PRIMARY KEY (`box_id`),

    KEY `idx_blind_boxes_user`
        (`user_id`, `status`),

    CONSTRAINT `fk_blind_boxes_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_blind_boxes_book`
        FOREIGN KEY (`book_id`)
        REFERENCES `books`(`book_id`)
);


CREATE TABLE `cart_items` (
    `cart_item_id` BIGINT NOT NULL AUTO_INCREMENT,

    `user_id` BIGINT NOT NULL,

    `book_id` BIGINT NULL,
    `blind_box_id` BIGINT NULL,

    `quantity` INT NOT NULL DEFAULT 1,

    `created_at` DATETIME(6) NOT NULL,

    PRIMARY KEY (`cart_item_id`),

    UNIQUE KEY `uk_cart_user_book`
        (`user_id`, `book_id`),

    UNIQUE KEY `uk_cart_blind_box`
        (`blind_box_id`),

    CONSTRAINT `fk_cart_items_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_cart_items_book`
        FOREIGN KEY (`book_id`)
        REFERENCES `books`(`book_id`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_cart_items_blind_box`
        FOREIGN KEY (`blind_box_id`)
        REFERENCES `blind_boxes`(`box_id`)
        ON DELETE CASCADE
);


CREATE TABLE `orders` (
    `order_id` BIGINT NOT NULL AUTO_INCREMENT,

    `order_code` VARCHAR(20) NOT NULL,

    `user_id` BIGINT NOT NULL,

    `shop_id` BIGINT NULL,

    `recipient_name` VARCHAR(100) NOT NULL,
    `recipient_phone` VARCHAR(20) NOT NULL,

    `shipping_address` TEXT NOT NULL,

    `note` VARCHAR(500) NULL,

    `payment_method` VARCHAR(20)
        NOT NULL DEFAULT 'COD',

    `voucher_code` VARCHAR(30) NULL,

    `subtotal` DECIMAL(10, 2) NOT NULL,

    `shipping_fee` DECIMAL(10, 2)
        NOT NULL DEFAULT 0.00,

    `discount_amount` DECIMAL(10, 2)
        NOT NULL DEFAULT 0.00,

    `total_amount` DECIMAL(10, 2) NOT NULL,

    `status` VARCHAR(20)
        NOT NULL DEFAULT 'PENDING',

    `created_at` DATETIME(6) NOT NULL,
    `updated_at` DATETIME(6) NULL,

    PRIMARY KEY (`order_id`),

    UNIQUE KEY `uk_orders_code`
        (`order_code`),

    KEY `idx_orders_user`
        (`user_id`, `created_at`),

    KEY `idx_orders_shop`
        (`shop_id`, `created_at`),

    KEY `idx_orders_status`
        (`status`),

    CONSTRAINT `fk_orders_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`),

    CONSTRAINT `fk_orders_shop`
        FOREIGN KEY (`shop_id`)
        REFERENCES `shops`(`shop_id`)
        ON DELETE SET NULL
);


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

    KEY `idx_order_items_order`
        (`order_id`),

    KEY `idx_order_items_book`
        (`book_id`),

    CONSTRAINT `fk_order_items_order`
        FOREIGN KEY (`order_id`)
        REFERENCES `orders`(`order_id`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_order_items_book`
        FOREIGN KEY (`book_id`)
        REFERENCES `books`(`book_id`),

    CONSTRAINT `fk_order_items_blind_box`
        FOREIGN KEY (`blind_box_id`)
        REFERENCES `blind_boxes`(`box_id`)
);


CREATE TABLE `order_status_history` (
    `history_id` BIGINT NOT NULL AUTO_INCREMENT,

    `order_id` BIGINT NOT NULL,

    `status` VARCHAR(20) NOT NULL,

    `note` VARCHAR(255) NULL,

    `created_at` DATETIME(6) NOT NULL,

    PRIMARY KEY (`history_id`),

    KEY `idx_order_history_order`
        (`order_id`, `created_at`),

    CONSTRAINT `fk_order_history_order`
        FOREIGN KEY (`order_id`)
        REFERENCES `orders`(`order_id`)
        ON DELETE CASCADE
);


CREATE TABLE `exchange_listings` (
    `listing_id` BIGINT NOT NULL AUTO_INCREMENT,

    `owner_id` BIGINT NOT NULL,

    `book_title` VARCHAR(255) NOT NULL,

    `wanted` VARCHAR(255) NOT NULL,

    `book_condition` VARCHAR(30) NOT NULL,

    `location` VARCHAR(100) NOT NULL,

    `cover_url` VARCHAR(500) NULL,

    `note` TEXT NULL,

    `status` VARCHAR(20)
        NOT NULL DEFAULT 'OPEN',

    `created_at` DATETIME(6) NOT NULL,

    `updated_at` DATETIME(6) NULL,

    PRIMARY KEY (`listing_id`),

    KEY `idx_exchange_listings_owner`
        (`owner_id`),

    KEY `idx_exchange_listings_status`
        (`status`, `created_at`),

    CONSTRAINT `fk_exchange_listings_owner`
        FOREIGN KEY (`owner_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
);


CREATE TABLE `exchange_offers` (
    `offer_id` BIGINT NOT NULL AUTO_INCREMENT,

    `listing_id` BIGINT NOT NULL,

    `sender_id` BIGINT NOT NULL,

    `offered_book` VARCHAR(255) NOT NULL,

    `message` TEXT NULL,

    `status` VARCHAR(20)
        NOT NULL DEFAULT 'PENDING',

    `created_at` DATETIME(6) NOT NULL,

    `responded_at` DATETIME(6) NULL,

    PRIMARY KEY (`offer_id`),

    KEY `idx_exchange_offers_listing`
        (`listing_id`, `status`),

    KEY `idx_exchange_offers_sender`
        (`sender_id`),

    CONSTRAINT `fk_exchange_offers_listing`
        FOREIGN KEY (`listing_id`)
        REFERENCES `exchange_listings`(`listing_id`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_exchange_offers_sender`
        FOREIGN KEY (`sender_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
);

-- ========================================================
-- 8. BÁO CÁO VI PHẠM
-- ========================================================

CREATE TABLE `reports` (
    `report_id` BIGINT AUTO_INCREMENT PRIMARY KEY,

    `reporter_id` BIGINT NOT NULL,

    `target_type` ENUM(
        'POST',
        'COMMENT',
        'USER',
        'CLUB'
    ) NOT NULL,

    `target_id` BIGINT NOT NULL,

    `reason` TEXT NOT NULL,

    -- BỔ SUNG TỪ DATABASE 1
    `detail` TEXT NULL,

    `status` ENUM(
        'PENDING',
        'RESOLVED',
        'DISMISSED'
    ) DEFAULT 'PENDING',

    `resolved_by` BIGINT DEFAULT NULL,

    -- BỔ SUNG TỪ DATABASE 1
    `resolved_at` DATETIME DEFAULT NULL,

    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (`reporter_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE,

    FOREIGN KEY (`resolved_by`)
        REFERENCES `users`(`user_id`)
        ON DELETE SET NULL
);

-- ========================================================
-- 9. GAMIFICATION & BẢNG XẾP HẠNG
-- ========================================================

CREATE TABLE `user_activities` (
    `activity_id` BIGINT AUTO_INCREMENT PRIMARY KEY,

    `user_id` BIGINT NOT NULL,

    `activity_type` ENUM(
        'READ_CHAPTER',
        'CREATE_POST',
        'WRITE_REVIEW',
        'EXCHANGE_BOOK',
        'LOGIN_STREAK'
    ) NOT NULL,

    `points_awarded` INT NOT NULL DEFAULT 0,

    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
);


CREATE TABLE `user_points` (
    `user_id` BIGINT PRIMARY KEY,

    `total_points` INT DEFAULT 0,

    `monthly_points` INT DEFAULT 0,

    `current_tier` VARCHAR(50)
        DEFAULT 'Tập Sự',

    `last_updated`
        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
);

-- ========================================================
-- 10. BẠN BÈ & LỜI MỜI KẾT BẠN
-- ========================================================

CREATE TABLE `friend_requests` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,

    `requester_id` BIGINT NOT NULL,
    `receiver_id` BIGINT NOT NULL,

    `status` ENUM(
        'PENDING',
        'ACCEPTED',
        'REJECTED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',

    `created_at`
        DATETIME(6)
        NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    `updated_at`
        DATETIME(6)
        NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),

    UNIQUE KEY `uk_friend_request_pair`
        (`requester_id`, `receiver_id`),

    KEY `idx_friend_request_receiver_status`
        (`receiver_id`, `status`),

    KEY `idx_friend_request_requester_status`
        (`requester_id`, `status`),

    CONSTRAINT `fk_friend_request_requester`
        FOREIGN KEY (`requester_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_friend_request_receiver`
        FOREIGN KEY (`receiver_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- 11. CHAT / TIN NHẮN
-- ========================================================

CREATE TABLE `chat_conversations` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,

    `type` VARCHAR(20)
        NOT NULL DEFAULT 'DIRECT',

    `name` VARCHAR(255) NULL,

    `created_by` BIGINT NULL,

    `created_at`
        TIMESTAMP(6)
        NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    `updated_at`
        TIMESTAMP(6)
        NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),

    KEY `idx_chat_conversations_updated_at`
        (`updated_at`),

    CONSTRAINT `fk_chat_conversations_creator`
        FOREIGN KEY (`created_by`)
        REFERENCES `users`(`user_id`)
        ON DELETE SET NULL
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `chat_conversation_participants` (
    `conversation_id` BIGINT NOT NULL,

    `user_id` BIGINT NOT NULL,

    PRIMARY KEY (`conversation_id`, `user_id`),

    KEY `idx_chat_participant_user`
        (`user_id`),

    CONSTRAINT `fk_chat_participant_conversation`
        FOREIGN KEY (`conversation_id`)
        REFERENCES `chat_conversations`(`id`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_chat_participant_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `chat_messages` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,

    `conversation_id` BIGINT NOT NULL,

    `sender_id` BIGINT NOT NULL,

    `content` VARCHAR(2000) NOT NULL,

    `type` VARCHAR(20)
        NOT NULL DEFAULT 'TEXT',

    `created_at`
        TIMESTAMP(6)
        NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),

    KEY `idx_chat_messages_conversation_created`
        (`conversation_id`, `created_at`),

    KEY `idx_chat_messages_sender`
        (`sender_id`),

    CONSTRAINT `fk_chat_message_conversation`
        FOREIGN KEY (`conversation_id`)
        REFERENCES `chat_conversations`(`id`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_chat_message_sender`
        FOREIGN KEY (`sender_id`)
        REFERENCES `users`(`user_id`)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- 12. INDEXES
-- ========================================================

CREATE INDEX `idx_post_reactions_post`
    ON `post_reactions`(`post_id`, `created_at`);

CREATE INDEX `idx_post_reactions_user`
    ON `post_reactions`(`user_id`, `post_id`);

CREATE INDEX `idx_comments_post_created`
    ON `comments`(`post_id`, `created_at`);

CREATE INDEX `idx_comments_user`
    ON `comments`(`user_id`, `created_at`);

CREATE INDEX `idx_posts_feed`
    ON `posts`(`user_id`, `created_at` DESC);

CREATE INDEX `idx_posts_club`
    ON `posts`(`club_id`);

CREATE INDEX `idx_posts_page`
    ON `posts`(`page_id`);

CREATE INDEX `idx_stories_active`
    ON `stories`(`expires_at`);

CREATE INDEX `idx_user_rankings`
    ON `user_points`(
        `monthly_points` DESC,
        `total_points` DESC
    );

-- ========================================================
-- 13. INDEX BỔ SUNG CHO REPORTS
-- ========================================================

CREATE INDEX `idx_reports_status`
    ON `reports`(`status`);

CREATE INDEX `idx_reports_target`
    ON `reports`(`target_type`, `target_id`);

CREATE INDEX `idx_reports_reporter`
    ON `reports`(`reporter_id`);

CREATE INDEX `idx_reports_resolved_by`
    ON `reports`(`resolved_by`);

-- ========================================================
-- 14. XÓA DỮ LIỆU CŨ / RESET DATABASE
-- ========================================================
-- Chỉ cần chạy phần này nếu muốn xóa dữ liệu hiện có.
-- Vì database vừa được tạo mới nên mặc định các bảng đang rỗng.

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `chat_messages`;
TRUNCATE TABLE `chat_conversation_participants`;
TRUNCATE TABLE `chat_conversations`;

TRUNCATE TABLE `friend_requests`;

TRUNCATE TABLE `notifications`;

TRUNCATE TABLE `exchange_offers`;
TRUNCATE TABLE `exchange_listings`;

TRUNCATE TABLE `order_status_history`;
TRUNCATE TABLE `order_items`;
TRUNCATE TABLE `orders`;

TRUNCATE TABLE `blind_boxes`;
TRUNCATE TABLE `cart_items`;
TRUNCATE TABLE `vouchers`;

TRUNCATE TABLE `book_chapters`;
TRUNCATE TABLE `reading_progress`;

TRUNCATE TABLE `books`;
TRUNCATE TABLE `authors`;
TRUNCATE TABLE `categories`;
TRUNCATE TABLE `shops`;

TRUNCATE TABLE `story_views`;
TRUNCATE TABLE `stories`;

TRUNCATE TABLE `post_reactions`;
TRUNCATE TABLE `comments`;
TRUNCATE TABLE `posts`;

TRUNCATE TABLE `club_members`;
TRUNCATE TABLE `book_clubs`;

TRUNCATE TABLE `page_admins`;
TRUNCATE TABLE `pages`;

TRUNCATE TABLE `user_activities`;
TRUNCATE TABLE `user_points`;

TRUNCATE TABLE `user_subscriptions`;
TRUNCATE TABLE `subscription_plans`;

TRUNCATE TABLE `reports`;

TRUNCATE TABLE `users`;

SET FOREIGN_KEY_CHECKS = 1;



