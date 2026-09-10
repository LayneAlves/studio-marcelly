USE studio_marcelly;

CREATE TABLE IF NOT EXISTS clients (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(160) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_clients_name (name),
    KEY idx_clients_phone (phone),
    KEY idx_clients_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_settings (
    id TINYINT UNSIGNED NOT NULL,
    opening_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 420,
    closing_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 1200,
    monday_closed TINYINT(1) NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO business_settings (id, opening_minutes, closing_minutes, monday_closed)
VALUES (1, 420, 1200, 1);

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

ALTER TABLE appointments
    ADD COLUMN client_id BIGINT UNSIGNED NULL AFTER id,
    ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER status,
    ADD COLUMN completed_at DATETIME NULL AFTER cancellation_reason,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

INSERT INTO clients (name, phone)
SELECT DISTINCT a.client_name, a.client_phone
FROM appointments a
WHERE NOT EXISTS (
    SELECT 1 FROM clients c WHERE c.phone = a.client_phone
);

UPDATE appointments a
JOIN clients c ON c.phone = a.client_phone
SET a.client_id = c.id
WHERE a.client_id IS NULL;

ALTER TABLE appointments
    ADD CONSTRAINT fk_appointments_client
    FOREIGN KEY (client_id) REFERENCES clients(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE clients
    ADD COLUMN password_hash VARCHAR(255) NULL AFTER email;

CREATE TABLE IF NOT EXISTS client_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    client_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_client_sessions_token (token_hash),
    KEY idx_client_sessions_client (client_id),
    CONSTRAINT fk_client_sessions_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
