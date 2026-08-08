/**
 * notifications.js
 * ----------------------------------------------------------------
 * Tiny helper for writing in-app notification rows. Kept separate from
 * server.js so every trigger point (job accepted, booking completed,
 * payment received, new review, etc.) calls the same single function
 * instead of hand-writing INSERT statements inline.
 *
 * Failures here are intentionally swallowed by the caller (server.js
 * wraps every notify() call in try/catch) — a notification that fails
 * to write should never fail the request that triggered it.
 * ----------------------------------------------------------------
 */

const pool = require('./db');

/**
 * @param {number} userId - recipient
 * @param {object} opts
 * @param {string} opts.type - short machine-readable event name, e.g. 'job_accepted'
 * @param {string} opts.title - short human-readable headline
 * @param {string} [opts.message] - optional longer body text
 * @param {string} [opts.relatedType] - 'job' | 'booking' | 'payment' | 'review'
 * @param {number} [opts.relatedId]
 */
async function notify(userId, { type, title, message = null, relatedType = null, relatedId = null }) {
  if (!userId || !type || !title) return;
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, related_type, related_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, title, message, relatedType, relatedId]
  );
}

module.exports = { notify };
