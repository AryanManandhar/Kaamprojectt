require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const crypto = require('crypto');
const { sendOtpEmail, sendPaymentDueEmail } = require('./mailer');
const {
  buildEsewaForm,
  verifyEsewaCallback,
  checkEsewaStatus,
  initiateKhaltiPayment,
  lookupKhaltiPayment,
} = require('./payments');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

// Where the API itself is reachable (used to build eSewa/Khalti redirect
// URLs that point back at this server) and where kam-app.html is served
// from (used to send the browser back to the app after payment). Both
// default to the values the rest of this project already assumes.
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500/kam-app.html';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get('/api/workers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM workers ORDER BY rating DESC');
    const workers = rows.map(w => ({
      ...w,
      skills: JSON.parse(w.skills),
      reviews: JSON.parse(w.reviews),
    }));
    res.json({ success: true, workers });
  } catch (err) {
    console.error('Fetch workers error:', err);
    res.status(500).json({ success: false, message: 'Could not load workers.' });
  }
});

app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );

    const token = jwt.sign({ userId: result.insertId, email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: { id: result.insertId, name, email },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

// ===================== Forgot Password =====================

app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.json({ success: true, message: 'If that email exists, a code has been sent.' });
    }

    const otp = String(crypto.randomInt(100000, 999999));
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'UPDATE users SET reset_otp = ?, reset_otp_expires = ? WHERE email = ?',
      [otp, expires, email]
    );

    await sendOtpEmail(email, otp);

    res.json({ success: true, message: 'If that email exists, a code has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, code, and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const [rows] = await pool.query(
      'SELECT id, reset_otp, reset_otp_expires FROM users WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid code or email.' });
    }

    const user = rows[0];
    if (!user.reset_otp || user.reset_otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid code.' });
    }
    if (!user.reset_otp_expires || new Date(user.reset_otp_expires) < new Date()) {
      return res.status(400).json({ success: false, message: 'This code has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await pool.query(
      'UPDATE users SET password_hash = ?, reset_otp = NULL, reset_otp_expires = NULL WHERE email = ?',
      [passwordHash, email]
    );

    res.json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Session expired, please log in again.' });
  }
}

app.get('/api/me', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.userId]);
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, user: rows[0] });
});

// ===================== Worker Availability =====================
// Get current worker availability status
app.get('/api/worker-availability', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT availability FROM workers WHERE id = ?',
      [req.user.userId]
    );
    if (rows.length === 0) {
      // If no worker profile exists, default to available
      return res.json({ success: true, availability: 'avail' });
    }
    res.json({ success: true, availability: rows[0].availability });
  } catch (err) {
    console.error('Fetch availability error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
});

// Update worker availability status
app.patch('/api/worker-availability', requireAuth, async (req, res) => {
  try {
    const { availability } = req.body;
    const allowed = ['avail', 'busy', 'off'];
    if (!allowed.includes(availability)) {
      return res.status(400).json({ success: false, message: "Availability must be 'avail', 'busy', or 'off'." });
    }

    // Update workers table availability
    await pool.query(
      'UPDATE workers SET availability = ? WHERE id = ?',
      [availability, req.user.userId]
    );

    res.json({ success: true, availability });
  } catch (err) {
    console.error('Update availability error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
});

// ===================== Jobs =====================

// Create a new job posting
app.post('/api/jobs', requireAuth, async (req, res) => {
  try {
    const { title, category, description, location, budget, scheduled_at } = req.body;

    if (!title || !category) {
      return res.status(400).json({ success: false, message: 'Title and category are required.' });
    }

    const [result] = await pool.query(
      'INSERT INTO jobs (user_id, title, category, description, location, budget, scheduled_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.userId, title, category, description || null, location || null, budget || null, scheduled_at || null, 'open']
    );

    res.json({ success: true, jobId: result.insertId });
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

// Get all open jobs from AVAILABLE workers only (for users to see as "incoming requests")
app.get('/api/jobs', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT jobs.*, users.name AS poster_name 
       FROM jobs 
       JOIN users ON jobs.user_id = users.id 
       JOIN workers ON jobs.user_id = workers.id 
       WHERE jobs.status = 'open' 
       AND workers.availability IN ('avail', 'busy')
       ORDER BY jobs.created_at DESC`
    );
    res.json({ success: true, jobs: rows });
  } catch (err) {
    console.error('Fetch jobs error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
});

// Get jobs posted by the logged-in user (for "My Posted Jobs" on worker side)
app.get('/api/jobs/mine', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT jobs.*, users.name AS poster_name 
       FROM jobs 
       JOIN users ON jobs.user_id = users.id 
       WHERE jobs.user_id = ? 
       ORDER BY jobs.created_at DESC`,
      [req.user.userId]
    );
    res.json({ success: true, jobs: rows });
  } catch (err) {
    console.error('Fetch my jobs error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
});

// User hires a worker from their posted deal (sets status to accepted)
app.patch('/api/jobs/:id', requireAuth, async (req, res) => {
  try {
    const jobId = req.params.id;
    const { status } = req.body;

    const allowedStatuses = ['accepted', 'declined', 'completed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'accepted', 'declined', or 'completed'." });
    }

    const [jobRows] = await pool.query('SELECT * FROM jobs WHERE id = ?', [jobId]);
    if (jobRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    // Only allow accepting if job is open
    if (status === 'accepted' && jobRows[0].status !== 'open') {
      return res.status(409).json({ success: false, message: 'This deal has already been taken.' });
    }

    await pool.query(
      'UPDATE jobs SET status = ?, worker_id = ? WHERE id = ?',
      [status, req.user.userId, jobId]
    );

    res.json({ success: true, jobId, status });
  } catch (err) {
    console.error('Update job status error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

// Get worker stats (jobs done count from accepted posted jobs)
app.get('/api/worker-stats', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) as jobs_done 
       FROM jobs 
       WHERE user_id = ? AND status IN ('accepted', 'completed')`,
      [req.user.userId]
    );
    res.json({ success: true, jobsDone: rows[0].jobs_done });
  } catch (err) {
    console.error('Fetch worker stats error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
});

// Delete a job (only if posted by the logged-in user)
app.delete('/api/jobs/:id', requireAuth, async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user.userId;

    // Check if job exists and belongs to this user
    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ? AND user_id = ?', [jobId, userId]);
    if (rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this job or job not found.' });
    }

    await pool.query('DELETE FROM jobs WHERE id = ?', [jobId]);
    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

// ===================== Bookings =====================
// Create a booking when user hires a worker
app.post('/api/bookings', requireAuth, async (req, res) => {
  try {
    const { job_id, worker_id } = req.body;
    const userId = req.user.userId;

    if (!job_id || !worker_id) {
      return res.status(400).json({ success: false, message: 'Job ID and Worker ID are required.' });
    }

    // Check if job exists and is open
    const [jobRows] = await pool.query("SELECT * FROM jobs WHERE id = ? AND status = 'open'", [job_id]);
    if (jobRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found or already taken.' });
    }

    // Create booking
    const [bookingResult] = await pool.query(
      'INSERT INTO bookings (job_id, worker_id, user_id, status) VALUES (?, ?, ?, ?)',
      [job_id, worker_id, userId, 'confirmed']
    );

    // Update job status to accepted
    await pool.query(
      "UPDATE jobs SET status = 'accepted' WHERE id = ?",
      [job_id]
    );

    res.json({ success: true, bookingId: bookingResult.insertId });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

// Get bookings for the logged-in user (jobs they hired)
app.get('/api/bookings/user', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, j.title, j.category, j.location, j.budget, u.name as worker_name, u.email as worker_email
       FROM bookings b
       JOIN jobs j ON b.job_id = j.id
       JOIN users u ON b.worker_id = u.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.userId]
    );
    res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error('Fetch user bookings error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
});

// Get bookings for the logged-in worker (jobs they were hired for)
app.get('/api/bookings/worker', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, j.title, j.category, j.location, j.budget, u.name as hirer_name
       FROM bookings b
       JOIN jobs j ON b.job_id = j.id
       JOIN users u ON b.user_id = u.id
       WHERE b.worker_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.userId]
    );
    res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error('Fetch worker bookings error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
});

// Update booking status (complete, cancel, etc.)
app.patch('/api/bookings/:id', requireAuth, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;

    const allowedStatuses = ['confirmed', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const [rows] = await pool.query(
      `SELECT b.*, j.title, u.name AS hirer_name, u.email AS hirer_email
       FROM bookings b
       JOIN jobs j ON b.job_id = j.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [bookingId]
    );
    const booking = rows[0];
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Only the assigned worker can mark it completed, and only from 'confirmed'.
    if (status === 'completed') {
      if (booking.worker_id !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Only the assigned worker can mark this job completed.' });
      }
      if (booking.status !== 'confirmed') {
        return res.status(409).json({ success: false, message: 'This booking is not in a state that can be completed.' });
      }
    }

    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId]);

    // If completed, also update job status and notify the hirer to pay
    if (status === 'completed') {
      await pool.query(
        "UPDATE jobs SET status = 'completed' WHERE id = (SELECT job_id FROM bookings WHERE id = ?)",
        [bookingId]
      );

      try {
        await sendPaymentDueEmail(booking.hirer_email, booking.hirer_name, booking.title, bookingId);
      } catch (mailErr) {
        console.error('Payment-due email failed (non-fatal):', mailErr);
      }
    }

    res.json({ success: true, message: 'Booking updated.' });
  } catch (err) {
    console.error('Update booking error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
});

// Real total earnings for the logged-in worker — sums all successful
// payments (payments.status = 'success') for bookings where they were
// the assigned worker, all-time.
app.get('/api/worker-earnings', requireAuth, async (req, res) => {
  try {
    const [[{ total }]] = await pool.query(
      `SELECT COALESCE(SUM(p.amount), 0) AS total
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       WHERE b.worker_id = ?
         AND p.status = 'success'`,
      [req.user.userId]
    );
    res.json({ success: true, earnings: Number(total) });
  } catch (err) {
    console.error('Fetch worker earnings error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
});

// ===================== Payments (eSewa / Khalti) =====================
// Payment happens AFTER the worker marks a booking completed. The hirer
// pays for a specific booking, so the amount always comes from the job's
// budget (or a manually entered amount if that job has no budget set).

// Kick off a payment: creates a pending row in `payments` and returns
// whatever the frontend needs to redirect the browser to the gateway.
app.post('/api/payments/initiate', requireAuth, async (req, res) => {
  try {
    const { booking_id, provider, amount: manualAmount } = req.body;

    if (!booking_id || !['esewa', 'khalti'].includes(provider)) {
      return res.status(400).json({ success: false, message: 'booking_id and a valid provider are required.' });
    }

    const [rows] = await pool.query(
      `SELECT b.id, b.user_id, b.status, b.payment_status, j.budget, j.title
       FROM bookings b
       JOIN jobs j ON b.job_id = j.id
       WHERE b.id = ?`,
      [booking_id]
    );
    const booking = rows[0];

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    if (booking.user_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'This is not your booking.' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'You can only pay for a completed booking.' });
    }
    if (booking.payment_status === 'paid') {
      return res.status(400).json({ success: false, message: 'This booking is already paid.' });
    }

    const amount = Number(booking.budget || manualAmount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Enter a valid amount to pay.' });
    }

    const transactionUuid = crypto.randomUUID();
    await pool.query(
      `INSERT INTO payments (booking_id, user_id, amount, provider, status, transaction_uuid)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [booking_id, req.user.userId, amount, provider, transactionUuid]
    );

    if (provider === 'esewa') {
      const { formAction, fields } = buildEsewaForm({
        amount,
        transactionUuid,
        successUrl: `${BACKEND_URL}/api/payments/esewa/success`,
        failureUrl: `${BACKEND_URL}/api/payments/esewa/failure`,
      });
      return res.json({ success: true, provider: 'esewa', formAction, fields });
    }

    // Khalti
    const [userRows] = await pool.query('SELECT name, email FROM users WHERE id = ?', [req.user.userId]);
    const user = userRows[0] || {};

    const khaltiData = await initiateKhaltiPayment({
      amount,
      purchaseOrderId: transactionUuid,
      purchaseOrderName: `Kam booking #${booking_id} — ${booking.title}`,
      returnUrl: `${BACKEND_URL}/api/payments/khalti/callback`,
      websiteUrl: BACKEND_URL,
      customerName: user.name,
      customerEmail: user.email,
    });

    await pool.query('UPDATE payments SET gateway_ref = ? WHERE transaction_uuid = ?', [
      khaltiData.pidx,
      transactionUuid,
    ]);

    res.json({ success: true, provider: 'khalti', payment_url: khaltiData.payment_url });
  } catch (err) {
    console.error('Initiate payment error:', err);
    res.status(500).json({ success: false, message: 'Could not start the payment. Please try again.' });
  }
});

// eSewa redirects the browser here after a successful payment, with a
// base64 `data` query param. We verify its signature AND re-confirm with
// eSewa's own status-check endpoint before trusting it.
app.get('/api/payments/esewa/success', async (req, res) => {
  try {
    const payload = verifyEsewaCallback(req.query.data);
    if (!payload) {
      return res.redirect(`${FRONTEND_URL}?payment=failed&reason=bad_signature`);
    }

    const [rows] = await pool.query('SELECT * FROM payments WHERE transaction_uuid = ?', [
      payload.transaction_uuid,
    ]);
    const payment = rows[0];
    if (!payment) {
      return res.redirect(`${FRONTEND_URL}?payment=failed&reason=not_found`);
    }

    const status = await checkEsewaStatus({
      totalAmount: payment.amount,
      transactionUuid: payment.transaction_uuid,
    });

    if (status.status === 'COMPLETE') {
      await pool.query(
        `UPDATE payments SET status = 'success', gateway_ref = ?, raw_response = ? WHERE id = ?`,
        [status.ref_id || null, JSON.stringify(status), payment.id]
      );
      await pool.query(`UPDATE bookings SET payment_status = 'paid' WHERE id = ?`, [payment.booking_id]);
      return res.redirect(`${FRONTEND_URL}?payment=success&booking_id=${payment.booking_id}`);
    }

    await pool.query(`UPDATE payments SET status = 'failed', raw_response = ? WHERE id = ?`, [
      JSON.stringify(status),
      payment.id,
    ]);
    res.redirect(`${FRONTEND_URL}?payment=failed&booking_id=${payment.booking_id}`);
  } catch (err) {
    console.error('eSewa success handler error:', err);
    res.redirect(`${FRONTEND_URL}?payment=failed&reason=server_error`);
  }
});

// eSewa sends the browser here if the user cancels or the payment fails.
app.get('/api/payments/esewa/failure', async (req, res) => {
  res.redirect(`${FRONTEND_URL}?payment=failed`);
});

// Khalti redirects the browser here (return_url) with ?pidx=...&status=...
// We ignore the query string's status and re-confirm with Khalti's lookup
// endpoint before trusting it.
app.get('/api/payments/khalti/callback', async (req, res) => {
  try {
    const { pidx } = req.query;
    if (!pidx) {
      return res.redirect(`${FRONTEND_URL}?payment=failed&reason=missing_pidx`);
    }

    const [rows] = await pool.query('SELECT * FROM payments WHERE gateway_ref = ?', [pidx]);
    const payment = rows[0];
    if (!payment) {
      return res.redirect(`${FRONTEND_URL}?payment=failed&reason=not_found`);
    }

    const lookup = await lookupKhaltiPayment(pidx);

    if (lookup.status === 'Completed') {
      await pool.query(
        `UPDATE payments SET status = 'success', gateway_ref = ?, raw_response = ? WHERE id = ?`,
        [lookup.transaction_id || pidx, JSON.stringify(lookup), payment.id]
      );
      await pool.query(`UPDATE bookings SET payment_status = 'paid' WHERE id = ?`, [payment.booking_id]);
      return res.redirect(`${FRONTEND_URL}?payment=success&booking_id=${payment.booking_id}`);
    }

    await pool.query(`UPDATE payments SET status = 'failed', raw_response = ? WHERE id = ?`, [
      JSON.stringify(lookup),
      payment.id,
    ]);
    res.redirect(`${FRONTEND_URL}?payment=failed&booking_id=${payment.booking_id}&status=${lookup.status}`);
  } catch (err) {
    console.error('Khalti callback error:', err);
    res.redirect(`${FRONTEND_URL}?payment=failed&reason=server_error`);
  }
});

const PORT = process.env.PORT || 4000;

const { verifyGoogleToken } = require('./oauthProviders');

app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Missing Google token.' });
    }

    const { providerId, email, name } = await verifyGoogleToken(idToken);

    // Link to an existing account with the same email, if any
    let [rows] = await pool.query(
      'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?',
      ['google', providerId]
    );

    let user;
    if (rows.length > 0) {
      user = rows[0];
    } else if (email) {
      const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        await pool.query(
          'UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ?',
          ['google', providerId, existing[0].id]
        );
        user = { ...existing[0], oauth_provider: 'google', oauth_id: providerId };
      }
    }

    if (!user) {
      const [result] = await pool.query(
        'INSERT INTO users (name, email, oauth_provider, oauth_id) VALUES (?, ?, ?, ?)',
        [name, email, 'google', providerId]
      );
      user = { id: result.insertId, name, email };
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ success: false, message: 'Google sign-in failed.' });
  }
});

app.listen(PORT, () => console.log(`Kam API running on http://localhost:${PORT}`));