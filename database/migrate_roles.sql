USE studio_marcelly;

-- Migration idempotente para instalações que já possuem a tabela `clients`.
SET @role_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'role'
);
SET @role_statement = IF(
    @role_exists = 0,
    "ALTER TABLE clients ADD COLUMN role ENUM('user','master') NOT NULL DEFAULT 'user' AFTER password_hash",
    'SELECT 1'
);
PREPARE role_query FROM @role_statement;
EXECUTE role_query;
DEALLOCATE PREPARE role_query;

SET @owner_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'is_owner'
);
SET @owner_statement = IF(
    @owner_exists = 0,
    'ALTER TABLE clients ADD COLUMN is_owner TINYINT(1) NOT NULL DEFAULT 0 AFTER role',
    'SELECT 1'
);
PREPARE owner_query FROM @owner_statement;
EXECUTE owner_query;
DEALLOCATE PREPARE owner_query;

SET @role_index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND INDEX_NAME = 'idx_clients_role'
);
SET @role_index_statement = IF(
    @role_index_exists = 0,
    'ALTER TABLE clients ADD KEY idx_clients_role (role,is_owner)',
    'SELECT 1'
);
PREPARE role_index_query FROM @role_index_statement;
EXECUTE role_index_query;
DEALLOCATE PREPARE role_index_query;

UPDATE clients
SET role = 'user', is_owner = 0
WHERE role IS NULL OR is_owner IS NULL;
