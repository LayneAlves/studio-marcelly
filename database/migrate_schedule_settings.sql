USE studio_marcelly;

CREATE TABLE IF NOT EXISTS business_hours (
    day_of_week TINYINT UNSIGNED NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    opening_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 420,
    closing_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 1200,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO business_hours (day_of_week, is_active, opening_minutes, closing_minutes)
SELECT days.day_of_week,
    CASE WHEN days.day_of_week = 1 AND COALESCE(settings.monday_closed, 1) = 1 THEN 0 ELSE 1 END,
    CASE WHEN days.day_of_week IN (0, 6) THEN 480 ELSE COALESCE(settings.opening_minutes, 420) END,
    CASE WHEN days.day_of_week = 0 THEN 840 WHEN days.day_of_week = 6 THEN 1080 ELSE COALESCE(settings.closing_minutes, 1200) END
FROM (
    SELECT 0 AS day_of_week UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
) AS days
LEFT JOIN business_settings AS settings ON settings.id = 1;

CREATE TABLE IF NOT EXISTS schedule_blocks (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    block_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_schedule_blocks_date (block_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
