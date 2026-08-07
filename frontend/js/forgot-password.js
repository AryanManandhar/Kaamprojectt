function openForgotPassword() {
  document.getElementById('forgot-pass-error').classList.remove('show');
  document.getElementById('forgot-pass-error').textContent = '';
  document.getElementById('forgot-step-email').style.display = 'block';
  document.getElementById('forgot-step-reset').style.display = 'none';
  document.getElementById('forgot-email').value = '';
  document.getElementById('forgot-otp').value = '';
  document.getElementById('forgot-new-pass').value = '';
  document.getElementById('forgot-pass-overlay').classList.add('open');
}
function closeForgotPasswordOverlay(e) {
  if (e.target === document.getElementById('forgot-pass-overlay')) closeForgotPasswordDirect();
}
function closeForgotPasswordDirect() {
  document.getElementById('forgot-pass-overlay').classList.remove('open');
}
function showForgotError(msg) {
  const el = document.getElementById('forgot-pass-error');
  el.textContent = msg;
  el.classList.add('show');
}

