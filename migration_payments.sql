-- Run this ONCE against your existing kam_app database to add real
-- payment tracking (eSewa / Khalti) for completed bookings.
--
--   mysql -u root -p kam_app < migration_payments.sql
--
-- Assumes the `bookings` and `jobs` tables already exist (they were
-- added after the original schema.sql, so this migration only adds
-- what payments need on top of them).

USE kam_app;

-- Tracks whether the hirer has paid for a completed booking yet.
ALTER TABLE bookings
  ADD COLUMN payment_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid' AFTER status;

-- One row per payment attempt (a booking can have more than one row
-- here if a first attempt fails and the user retries).
CREATE TABLE IF NOT EXISTS payments (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  booking_id        INT NOT NULL,
  user_id           INT NOT NULL,               -- the hirer, i.e. who is paying
  amount            DECIMAL(10, 2) NOT NULL,
  provider          ENUM('esewa', 'khalti') NOT NULL,
  status            ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
  transaction_uuid  VARCHAR(64) NOT NULL UNIQUE, -- our own reference, sent to the gateway
  gateway_ref       VARCHAR(191) NULL,           -- eSewa ref_id / Khalti transaction_id
  raw_response      TEXT NULL,                   -- last gateway response, for debugging/support
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_payments_booking (booking_id)
);