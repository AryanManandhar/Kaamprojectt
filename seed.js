/**
 * seed.js
 * ----------------------------------------------------------------
 * Inserts a few test accounts into the users table so you can log
 * in and test the app without signing up manually each time.
 *
 * Usage (from the kam-backend folder, with .env already set up):
 *   node seed.js
 *
 * Safe to re-run — existing test accounts are skipped instead of
 * duplicated or errored on.
 * ----------------------------------------------------------------
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./db');

const SALT_ROUNDS = 10;

// Add/remove test users here as needed.
const TEST_USERS = [
  { name: 'Test User',   email: 'test@example.com',   password: 'password123' },
  { name: 'Alice Admin', email: 'alice@example.com',   password: 'password123' },
  { name: 'Bob Builder', email: 'bob@example.com',     password: 'password123' },
];

async function seed() {
  console.log('Seeding test users...\n');

  for (const u of TEST_USERS) {
    try {
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [u.email]);
      if (existing.length > 0) {
        console.log(`- Skipped ${u.email} (already exists)`);
        continue;
      }

      const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
      await pool.query(
        'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
        [u.name, u.email, passwordHash]
      );
      console.log(`- Created ${u.email} / password: ${u.password}`);
    } catch (err) {
      console.error(`- Failed to seed ${u.email}:`, err.message);
    }
  }

  console.log('\nDone. Log in with any of the emails above and password "password123".');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
