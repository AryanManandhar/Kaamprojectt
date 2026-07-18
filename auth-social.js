/**
 * auth-social.js
 * ----------------------------------------------------------------
 * Wires up the Google / Facebook buttons in kam-app.html to their
 * official SDKs, then sends the resulting token to your backend
 * (server.js) to be verified and exchanged for your app's own JWT.
 *
 * SETUP (do this before it will work):
 *   1. Fill in the two config values below (CLIENT IDs), which are
 *      public and safe to ship in frontend code.
 *   2. Point API_BASE at wherever server.js is running.
 *   3. See SETUP_GOOGLE_FACEBOOK.md for how to register the apps
 *      with Google and Facebook to get those client IDs.
 * ----------------------------------------------------------------
 */

const API_BASE = 'http://localhost:4000';
window.API_BASE = API_BASE; // shared with the inline email/password form in kam-app.html

const SOCIAL_CONFIG = {
  googleClientId: '383018510573-mjudgsq160dv93gpbmlaob2g52qhfl9a.apps.googleusercontent.com',
  facebookAppId: 'your-facebook-app-id',
};

// ---------- shared helper: hand off to the same place your existing
// email/password login lands after a successful response ----------
function handleAuthSuccess(data) {
  if (!data.success) {
    alert(data.message || 'Sign-in failed.');
    return;
  }
  localStorage.setItem('kam_token', data.token);
  localStorage.setItem('kam_user', JSON.stringify(data.user));
  // kam-app.html defines showDashboard() to swap screens without a full reload.
  if (typeof showDashboard === 'function') {
    showDashboard(data.user);
  } else {
    window.location.reload();
  }
}

// =========================== GOOGLE ===========================
function initGoogleLogin() {
  if (!window.google || !google.accounts || !google.accounts.id) return;

  google.accounts.id.initialize({
    client_id: SOCIAL_CONFIG.googleClientId,
    callback: async (response) => {
      try {
        // response.credential is the ID token (a JWT) — send it as-is
        const res = await fetch(`${API_BASE}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: response.credential }),
        });
        handleAuthSuccess(await res.json());
      } catch (err) {
        console.error('Google sign-in error:', err);
        alert('Could not reach the sign-in server.');
      }
    },
  });

  const btn = document.getElementById('btn-google');
  if (btn) {
    btn.addEventListener('click', () => google.accounts.id.prompt());
  }
}

// ========================== FACEBOOK ==========================
window.fbAsyncInit = function () {
  FB.init({
    appId: SOCIAL_CONFIG.facebookAppId,
    cookie: true,
    xfbml: false,
    version: 'v20.0',
  });
};

function initFacebookLogin() {
  const btn = document.getElementById('btn-facebook');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!window.FB) {
      alert('Facebook SDK is still loading, please try again in a moment.');
      return;
    }
    FB.login(
      async (response) => {
        if (response.authResponse) {
          try {
            const res = await fetch(`${API_BASE}/api/auth/facebook`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken: response.authResponse.accessToken }),
            });
            handleAuthSuccess(await res.json());
          } catch (err) {
            console.error('Facebook sign-in error:', err);
            alert('Could not reach the sign-in server.');
          }
        }
      },
      { scope: 'public_profile,email' }
    );
  });
}

// ============================ INIT ============================
document.addEventListener('DOMContentLoaded', () => {
  // Google's SDK loads async; retry briefly if it hasn't attached to window yet.
  if (window.google) {
    initGoogleLogin();
  } else {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (window.google) { initGoogleLogin(); clearInterval(timer); }
      else if (attempts > 20) { clearInterval(timer); } // ~10s, then give up quietly
    }, 500);
  }
  initFacebookLogin(); // FB object is created async by the SDK script itself
});
