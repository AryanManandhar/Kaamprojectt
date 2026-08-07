let isSignupMode = false;
function toggleAuthMode() {
  isSignupMode = !isSignupMode;
  document.getElementById('signup-name').style.display = isSignupMode ? 'block' : 'none';
  document.getElementById('auth-submit-btn').textContent = isSignupMode ? 'Sign Up for Kam' : 'Sign In to Kam';
  document.getElementById('auth-toggle-line').innerHTML = isSignupMode
    ? 'Already have an account? <a onclick="toggleAuthMode()">Sign in</a>'
    : "Don't have an account? <a onclick=\"toggleAuthMode()\">Sign up</a>";
  hideAuthError();
}
function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.add('show');
}
function hideAuthError() {
  document.getElementById('auth-error').classList.remove('show');
}
