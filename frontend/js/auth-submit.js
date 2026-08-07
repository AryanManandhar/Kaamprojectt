async function submitAuthForm() {
  hideAuthError();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;
  const name = document.getElementById('signup-name').value.trim();

  if (!email || !password) { showAuthError('Please enter email and password.'); return; }
  if (isSignupMode && !name) { showAuthError('Please enter your name.'); return; }

  // 🔒 Hash password in the browser before it ever touches the network.
  // "hello123" -> "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
  const hashedPassword = await sha256(password);

  const endpoint = isSignupMode ? '/api/signup' : '/api/login';
  const body = isSignupMode
    ? { name, email, password: hashedPassword }
    : { email, password: hashedPassword };

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

