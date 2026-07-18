/**
 * admin-server.js
 * ----------------------------------------------------------------
 * A small, separate admin panel for viewing and managing users in
 * the kam_app database. Runs on its own port (8080) so it never
 * touches or risks breaking server.js (which stays on port 4000).
 *
 * SETUP:
 *   1. npm install   (make sure mysql2 and dotenv are installed —
 *      see the note at the bottom of this file if they're missing)
 *   2. Add this line to kam-backend/.env:
 *        ADMIN_PASSWORD=choose_something_only_you_know
 *   3. Run:  node admin-server.js
 *   4. Open http://localhost:8080 and enter the admin password.
 * ----------------------------------------------------------------
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_PORT = process.env.ADMIN_PORT || 8080;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.warn(
    '\n⚠️  ADMIN_PASSWORD is not set in .env — the admin panel will refuse all requests.\n' +
    '    Add a line like ADMIN_PASSWORD=something_secret to kam-backend/.env and restart.\n'
  );
}

// Reuses the same MySQL connection details your main API already uses.
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kam_app',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5,
});

// ---------------------------------------------------------------
// Very simple password gate. Not a real auth system — this is a
// local admin tool, not something to expose on the public internet.
// The password is sent as a header on every request.
// ---------------------------------------------------------------
function requireAdmin(req, res, next) {
  const supplied = req.header('x-admin-password');
  if (!ADMIN_PASSWORD || supplied !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Invalid admin password.' });
  }
  next();
}

// Lets the frontend check a password without doing anything else yet.
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Wrong password.' });
  }
  res.json({ success: true });
});

// List all users (never returns password_hash).
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, oauth_provider, oauth_id, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json({ success: true, users: rows });
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// Delete a single user by id.
app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete user:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// Basic stats for the top of the dashboard.
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM users');
    const [[{ withPassword }]] = await pool.query(
      'SELECT COUNT(*) AS withPassword FROM users WHERE password_hash IS NOT NULL'
    );
    const [[{ oauthUsers }]] = await pool.query(
      'SELECT COUNT(*) AS oauthUsers FROM users WHERE oauth_provider IS NOT NULL'
    );
    res.json({ success: true, stats: { total, withPassword, oauthUsers } });
  } catch (err) {
    console.error('Failed to fetch stats:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

app.listen(ADMIN_PORT, () => {
  console.log(`Kam Admin Panel running on http://localhost:${ADMIN_PORT}`);
});

/**
 * If `npm start` / `node admin-server.js` fails with something like
 * "Cannot find module 'mysql2'", run:
 *
 *   npm install mysql2 dotenv
 *
 * (express is almost certainly already installed since server.js uses it.)
 */
