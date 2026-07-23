-- Kam App Database Schema

CREATE DATABASE IF NOT EXISTS kam_app
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE kam_app;

-- ==========================
-- USERS
-- ==========================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    password_hash VARCHAR(255) DEFAULT NULL,
    oauth_provider VARCHAR(20) DEFAULT NULL,
    oauth_id VARCHAR(191) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uniq_provider_account (oauth_provider, oauth_id)
);

-- ==========================
-- WORKERS
-- ==========================
CREATE TABLE IF NOT EXISTS workers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    rating DECIMAL(2,1) DEFAULT 0,
    jobs_completed INT DEFAULT 0,
    houses_served INT DEFAULT 0,
    availability ENUM('avail','busy','off') DEFAULT 'avail',
    years_experience INT DEFAULT 0,
    bio TEXT,
    emoji VARCHAR(10),
    skills JSON,
    reviews JSON
);

-- ==========================
-- JOBS
-- ==========================
CREATE TABLE IF NOT EXISTS jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    location VARCHAR(150),
    budget DECIMAL(10,2),
    status ENUM('open','accepted','declined','completed') DEFAULT 'open',
    worker_id INT DEFAULT NULL,
    scheduled_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (worker_id) REFERENCES workers(id)
        ON DELETE SET NULL
);

-- ==========================
-- BOOKINGS
-- ==========================
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    worker_id INT NOT NULL,
    user_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (job_id) REFERENCES jobs(id)
        ON DELETE CASCADE,

    FOREIGN KEY (worker_id) REFERENCES workers(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

-- ==========================
-- PAYMENTS
-- ==========================
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