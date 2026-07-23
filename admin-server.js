/**
 * admin-server.js
 * ----------------------------------------------------------------
 * A small, separate admin panel for viewing and managing data in
 * the kam_app database. Runs on its own port (8080) so it never
 * touches or risks breaking server.js (which stays on port 4000).
 *
 * Covers: Users, Workers, Jobs, Bookings, Payments.
 *
 * SETUP:
 *   1. npm install   (make sure mysql2 and dotenv are installed)
 *   2. Add this line to .env:
 *        ADMIN_PASSWORD=choose_something_only_you_know
 *   3. Run:  node admin-server.js
 *   4. Open http://localhost:8080/admin.html and enter the admin password.
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
    '    Add a line like ADMIN_PASSWORD=something_secret to your .env and restart.\n'
  );
}

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
// ---------------------------------------------------------------
function requireAdmin(req, res, next) {
  const supplied = req.header('x-admin-password');
  if (!ADMIN_PASSWORD || supplied !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Invalid admin password.' });
  }
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Wrong password.' });
  }
  res.json({ success: true });
});

// =========================================================
// USERS
// =========================================================

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

// Delete a single user (and anything that references them, so the
// foreign keys on bookings/jobs/payments don't block the delete).
app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Payments reference bookings, so clear those first.
    await conn.query(
      `DELETE payments FROM payments
       JOIN bookings ON payments.booking_id = bookings.id
       WHERE bookings.user_id = ? OR bookings.worker_id = ?`,
      [userId, userId]
    );
    await conn.query('DELETE FROM bookings WHERE user_id = ? OR worker_id = ?', [userId, userId]);
    await conn.query('DELETE FROM jobs WHERE user_id = ?', [userId]);
    await conn.query('UPDATE jobs SET worker_id = NULL WHERE worker_id = ?', [userId]);

    const [result] = await conn.query('DELETE FROM users WHERE id = ?', [userId]);

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('Failed to delete user:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  } finally {
    conn.release();
  }
});

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

// =========================================================
// WORKERS
// =========================================================

app.get('/api/admin/workers', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, category, rating, jobs_completed, houses_served,
              availability, years_experience, emoji
       FROM workers
       ORDER BY rating DESC`
    );
    res.json({ success: true, workers: rows });
  } catch (err) {
    console.error('Failed to fetch workers:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

app.patch('/api/admin/workers/:id', requireAdmin, async (req, res) => {
  try {
    const { availability } = req.body || {};
    const allowed = ['avail', 'busy', 'off'];
    if (!allowed.includes(availability)) {
      return res.status(400).json({ success: false, message: "Availability must be 'avail', 'busy', or 'off'." });
    }
    const [result] = await pool.query(
      'UPDATE workers SET availability = ? WHERE id = ?',
      [availability, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Worker not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update worker:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

app.delete('/api/admin/workers/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM workers WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Worker not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete worker:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// =========================================================
// JOBS
// =========================================================

app.get('/api/admin/jobs', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT jobs.*, users.name AS poster_name
       FROM jobs
       JOIN users ON jobs.user_id = users.id
       ORDER BY jobs.created_at DESC`
    );
    res.json({ success: true, jobs: rows });
  } catch (err) {
    console.error('Failed to fetch jobs:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

app.delete('/api/admin/jobs/:id', requireAdmin, async (req, res) => {
  const jobId = req.params.id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `DELETE payments FROM payments
       JOIN bookings ON payments.booking_id = bookings.id
       WHERE bookings.job_id = ?`,
      [jobId]
    );
    await conn.query('DELETE FROM bookings WHERE job_id = ?', [jobId]);
    const [result] = await conn.query('DELETE FROM jobs WHERE id = ?', [jobId]);
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('Failed to delete job:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  } finally {
    conn.release();
  }
});

// =========================================================
// BOOKINGS
// =========================================================

app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT bookings.*, jobs.title AS job_title,
              hirer.name AS hirer_name, hirer.email AS hirer_email,
              worker.name AS worker_name, worker.email AS worker_email
       FROM bookings
       JOIN jobs ON bookings.job_id = jobs.id
       JOIN users hirer ON bookings.user_id = hirer.id
       JOIN users worker ON bookings.worker_id = worker.id
       ORDER BY bookings.created_at DESC`
    );
    res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error('Failed to fetch bookings:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

app.delete('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
  const bookingId = req.params.id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM payments WHERE booking_id = ?', [bookingId]);
    const [result] = await conn.query('DELETE FROM bookings WHERE id = ?', [bookingId]);
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('Failed to delete booking:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  } finally {
    conn.release();
  }
});

// =========================================================
// PAYMENTS
// =========================================================

app.get('/api/admin/payments', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT payments.*, jobs.title AS job_title,
              hirer.name AS hirer_name, hirer.email AS hirer_email,
              worker.name AS worker_name
       FROM payments
       JOIN bookings ON payments.booking_id = bookings.id
       JOIN jobs ON bookings.job_id = jobs.id
       JOIN users hirer ON payments.user_id = hirer.id
       JOIN users worker ON bookings.worker_id = worker.id
       ORDER BY payments.created_at DESC`
    );
    res.json({ success: true, payments: rows });
  } catch (err) {
    console.error('Failed to fetch payments:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// Delete a payment record (e.g. to clean up test/sandbox transactions).
// This only removes the payment log row — it does not touch the booking
// itself, so use with care if the booking is genuinely paid.
app.delete('/api/admin/payments/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM payments WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete payment:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

app.listen(ADMIN_PORT, () => {
  console.log(`Kam Admin Panel running on http://localhost:${ADMIN_PORT}`);
});