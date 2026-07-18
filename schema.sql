-- Kam app — database schema
-- Run this once to set up the database and users table.

CREATE DATABASE IF NOT EXISTS kam_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kam_app;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
