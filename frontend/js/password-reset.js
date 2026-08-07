let forgotEmailInProgress = '';

async function requestPasswordResetOtp() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) { showForgotError('Please enter your email.'); return; }

  const btn = document.getElementById('forgot-send-btn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!data.success) { showForgotError(data.message || 'Something went wrong.'); return; }
    forgotEmailInProgress = email;
    document.getElementById('forgot-step-email').style.display = 'none';
    document.getElementById('forgot-step-reset').style.display = 'block';
    toast('Code sent! Check your email.');
  } catch (err) {
    showForgotError('Could not reach the server.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send code';
  }
}

async function resendPasswordResetOtp() {
  if (!forgotEmailInProgress) return;
  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmailInProgress }),
    });
    const data = await res.json();
    if (data.success) toast('New code sent!');
    else showForgotError(data.message || 'Something went wrong.');
  } catch (err) {
    showForgotError('Could not reach the server.');
  }
}

async function submitPasswordReset() {
  const otp = document.getElementById('forgot-otp').value.trim();
  const newPass = document.getElementById('forgot-new-pass').value;

  if (!otp || !newPass) { showForgotError('Please enter the code and a new password.'); return; }
  if (newPass.length < 6) { showForgotError('Password must be at least 6 characters.'); return; }

  const btn = document.getElementById('forgot-reset-btn');
  btn.disabled = true;
  btn.textContent = 'Resetting...';

  try {
    // Hash the new password the same way signup/login do, before sending it.
    const hashedNewPass = await sha256(newPass);

    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmailInProgress, otp, newPassword: hashedNewPass }),
    });
    const data = await res.json();
    if (!data.success) { showForgotError(data.message || 'Something went wrong.'); return; }
    closeForgotPasswordDirect();
    toast('Password updated! You can now sign in.');
  } catch (err) {
    showForgotError('Could not reach the server.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Reset password';
  }
}
