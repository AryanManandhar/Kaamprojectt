require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

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

    await pool.query(
      'UPDATE bookings SET status = ? WHERE id = ?',
      [status, bookingId]
    );

    // If completed, also update job status
    if (status === 'completed') {
      await pool.query(
        "UPDATE jobs SET status = 'completed' WHERE id = (SELECT job_id FROM bookings WHERE id = ?)",
        [bookingId]
      );
    }

    res.json({ success: true, message: 'Booking updated.' });
  } catch (err) {
    console.error('Update booking error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong.' });
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