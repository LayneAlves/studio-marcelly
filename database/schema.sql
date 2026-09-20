CREATE DATABASE IF NOT EXISTS studio_marcelly
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE studio_marcelly;

CREATE TABLE IF NOT EXISTS services (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(80) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    duration VARCHAR(40) NOT NULL,
    deposit DECIMAL(10,2) NULL,
    maintenance_days SMALLINT UNSIGNED NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS appointments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    client_id BIGINT UNSIGNED NULL,
    client_name VARCHAR(120) NOT NULL,
    client_phone VARCHAR(30) NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    service_name VARCHAR(80) NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes SMALLINT UNSIGNED NOT NULL,
    service_price DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) NULL,
    notes TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    cancellation_reason VARCHAR(500) NULL,
    completed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_appointments_date_status (booking_date, status),
    CONSTRAINT fk_appointments_client
        FOREIGN KEY (client_id) REFERENCES clients(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_appointments_service
        FOREIGN KEY (service_id) REFERENCES services(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS maintenance_records (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    client_id BIGINT UNSIGNED NOT NULL,
    completed_appointment_id BIGINT UNSIGNED NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    service_name VARCHAR(80) NOT NULL,
    maintenance_days SMALLINT UNSIGNED NOT NULL,
    last_appointment_date DATE NOT NULL,
    maintenance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'awaiting',
    reminder_sent_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_maintenance_completed_appointment (completed_appointment_id),
    KEY idx_maintenance_client_date (client_id, maintenance_date),
    KEY idx_maintenance_status_date (status, maintenance_date),
    CONSTRAINT fk_maintenance_client
        FOREIGN KEY (client_id) REFERENCES clients(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_maintenance_appointment
        FOREIGN KEY (completed_appointment_id) REFERENCES appointments(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_maintenance_service
        FOREIGN KEY (service_id) REFERENCES services(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Para instalações que já possuíam a tabela de agendamentos, execute uma vez:
-- ALTER TABLE appointments ADD COLUMN client_id BIGINT UNSIGNED NULL AFTER id,
--     ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER status,
--     ADD COLUMN completed_at DATETIME NULL AFTER cancellation_reason,
--     ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
--     ADD CONSTRAINT fk_appointments_client FOREIGN KEY (client_id) REFERENCES clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- INSERT INTO clients (name, phone)
-- SELECT DISTINCT a.client_name, a.client_phone FROM appointments a
-- WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE c.phone = a.client_phone);
-- UPDATE appointments a JOIN clients c ON c.phone = a.client_phone SET a.client_id = c.id WHERE a.client_id IS NULL;
