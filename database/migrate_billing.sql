USE studio_marcelly;

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER deposit_amount;

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS payment_recorded_manually TINYINT(1) NOT NULL DEFAULT 0 AFTER paid_amount;
