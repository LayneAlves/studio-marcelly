-- Execute este arquivo dentro do banco já selecionado no phpMyAdmin da Hostinger.
-- A migration é idempotente: pode ser importada uma única vez com segurança.

CREATE TABLE IF NOT EXISTS client_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    client_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_client_sessions_token (token_hash),
    KEY idx_client_sessions_client (client_id),
    CONSTRAINT fk_client_sessions_client
        FOREIGN KEY (client_id) REFERENCES clients(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
