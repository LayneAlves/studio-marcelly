USE studio_marcelly;

-- Pode ser executado mais de uma vez: a coluna sÃ³ Ã© criada se ainda nÃ£o existir.
SET @maintenance_days_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'services'
      AND COLUMN_NAME = 'maintenance_days'
);
SET @maintenance_days_statement = IF(
    @maintenance_days_exists = 0,
    'ALTER TABLE services ADD COLUMN maintenance_days SMALLINT UNSIGNED NULL AFTER deposit',
    'SELECT 1'
);
PREPARE maintenance_days_query FROM @maintenance_days_statement;
EXECUTE maintenance_days_query;
DEALLOCATE PREPARE maintenance_days_query;

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

SET @record_maintenance_days_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'maintenance_records'
      AND COLUMN_NAME = 'maintenance_days'
);
SET @record_maintenance_days_statement = IF(
    @record_maintenance_days_exists = 0,
    'ALTER TABLE maintenance_records ADD COLUMN maintenance_days SMALLINT UNSIGNED NULL AFTER service_name',
    'SELECT 1'
);
PREPARE record_maintenance_days_query FROM @record_maintenance_days_statement;
EXECUTE record_maintenance_days_query;
DEALLOCATE PREPARE record_maintenance_days_query;
