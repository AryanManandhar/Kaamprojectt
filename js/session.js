(function tryResumeSession() {
  const token = localStorage.getItem('kam_token');
  const userRaw = localStorage.getItem('kam_user');
  if (token && userRaw) {
    try { showDashboard(JSON.parse(userRaw)); } catch (e) { /* ignore malformed cache */ }
  }
})();
