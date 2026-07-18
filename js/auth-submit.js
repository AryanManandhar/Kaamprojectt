async function submitAuthForm() {
  hideAuthError();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;
  const name = document.getElementById('signup-name').value.trim();

  if (!email || !password) { showAuthError('Please enter email and password.'); return; }
  if (isSignupMode && !name) { showAuthError('Please enter your name.'); return; }

  const endpoint = isSignupMode ? '/api/signup' : '/api/login';
  const body = isSignupMode ? { name, email, password } : { email, password };

  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) { showAuthError(data.message || 'Something went wrong.'); return; }
    handleAuthSuccess(data);
  } catch (err) {
    showAuthError('Could not reach the server. Is the API running on ' + (window.API_BASE || 'http://localhost:4000') + '?');
  }
}

function handleAuthSuccess(data) {
  if (!data.success) {
    showAuthError(data.message || 'Sign-in failed.');
    return;
  }
  localStorage.setItem('kam_token', data.token);
  localStorage.setItem('kam_user', JSON.stringify(data.user));
  showDashboard(data.user);
}

