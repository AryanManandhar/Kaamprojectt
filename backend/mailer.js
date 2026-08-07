/**
 * mailer.js
 * ----------------------------------------------------------------
 * Sends transactional emails for Kam using nodemailer + any SMTP
 * provider (Gmail, SendGrid, Mailtrap, etc). Two things use this:
 *   - the "forgot password" flow (sends a 6-digit OTP)
 *   - the "mark job completed" flow (tells the hirer a payment is due)
 *
 * SETUP:
 *   1. npm install nodemailer
 *   2. Add these to kam-backend/.env:
 *        SMTP_HOST=smtp.gmail.com
 *        SMTP_PORT=587
 *        SMTP_USER=you@gmail.com
 *        SMTP_PASS=your_app_password        <- NOT your normal password;
 *                                               use a Gmail "App Password"
 *                                               (Google Account > Security >
 *                                               2-Step Verification > App
 *                                               passwords) if using Gmail.
 *        MAIL_FROM="Kam <you@gmail.com>"
 *
 *   Any SMTP provider works the same way — just change HOST/PORT/USER/PASS.
 *   For local testing without sending real email, use Mailtrap.io (free)
 *   and paste its SMTP credentials instead.
 * ----------------------------------------------------------------
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500/kam-app.html';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(
      '\n⚠️  SMTP_HOST / SMTP_USER / SMTP_PASS are not set in .env — emails will ' +
      'be logged to the console instead of actually sent.\n'
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true for port 465, false for 587/25
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

// Falls back to console logging if SMTP isn't configured yet, so the rest
// of the app (signup/login/forgot-password) keeps working in local dev
// even before you've set up a real mail provider.
async function send({ to, subject, html, text }) {
  const t = getTransporter();
  const from = process.env.MAIL_FROM || 'Kam <no-reply@kam.local>';

  if (!t) {
    console.log('\n--- Email (SMTP not configured, printed instead) ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log(text || html);
    console.log('-----------------------------------------------------\n');
    return;
  }

  await t.sendMail({ from, to, subject, html, text });
}

async function sendOtpEmail(email, otp) {
  await send({
    to: email,
    subject: `Your Kam password reset code: ${otp}`,
    text: `Your Kam password reset code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family:sans-serif; max-width:420px; margin:0 auto;">
        <h2 style="color:#C8681A;">Reset your Kam password</h2>
        <p>Use this code to reset your password. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:32px; font-weight:700; letter-spacing:6px; background:#FDF7EE; padding:16px 20px; border-radius:10px; text-align:center; margin:20px 0;">
          ${otp}
        </div>
        <p style="color:#777; font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

async function sendPaymentDueEmail(hirerEmail, hirerName, jobTitle, bookingId) {
  if (!hirerEmail) return; // some OAuth accounts may not have an email on file

  await send({
    to: hirerEmail,
    subject: `Payment due for "${jobTitle}" on Kam`,
    text: `Hi ${hirerName || 'there'}, the worker has marked "${jobTitle}" (booking #${bookingId}) as completed. Please log in to Kam to pay: ${FRONTEND_URL}`,
    html: `
      <div style="font-family:sans-serif; max-width:420px; margin:0 auto;">
        <h2 style="color:#C8681A;">Job completed — payment due</h2>
        <p>Hi ${hirerName || 'there'},</p>
        <p>The worker has marked <strong>${jobTitle}</strong> (booking #${bookingId}) as completed.</p>
        <p>Please log in to Kam to review and pay for the job.</p>
        <a href="${FRONTEND_URL}" style="display:inline-block; margin-top:12px; background:#C8681A; color:#fff; text-decoration:none; padding:10px 20px; border-radius:8px;">
          Open Kam
        </a>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail, sendPaymentDueEmail };
