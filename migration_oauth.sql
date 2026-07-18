-- Run this ONCE against your existing kam_app database to add OAuth support
-- without losing your current users.
--
--   mysql -u root -p kam_app < migration_oauth.sql

USE kam_app;

ALTER TABLE users
  MODIFY password_hash VARCHAR(255) NULL,
  ADD COLUMN oauth_provider VARCHAR(20) NULL AFTER password_hash,
  ADD COLUMN oauth_id VARCHAR(191) NULL AFTER oauth_provider,
  ADD UNIQUE KEY uniq_provider_account (oauth_provider, oauth_id);

-- email was NOT NULL before; some OAuth providers (mainly Apple, after the
-- first login) can withhold it, so relax that constraint too:
ALTER TABLE users
  MODIFY email VARCHAR(150) NULL UNIQUE;
