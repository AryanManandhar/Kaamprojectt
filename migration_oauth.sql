-- Run this ONCE against your existing kam_app database to add OAuth support
-- without losing your current users.
--
--   mysql -u root -p kam_app < migration_oauth.sql

USE kam_app;

-- Update users table for OAuth support
ALTER TABLE users
    MODIFY password_hash VARCHAR(255) NULL;

ALTER TABLE users
    MODIFY email VARCHAR(150) NULL;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20) NULL AFTER password_hash,
    ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(191) NULL AFTER oauth_provider;

ALTER TABLE users
    ADD UNIQUE KEY IF NOT EXISTS uniq_provider_account (oauth_provider, oauth_id);

-- Create workers table if it doesn't exist
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

-- Create jobs table if it doesn't exist
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bookings table if it doesn't exist
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    worker_id INT NOT NULL,
    user_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
