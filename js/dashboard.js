function showDashboard(user) {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('dashboard-screen').classList.add('active');
  if (user) {
    document.getElementById('drawer-name').textContent = user.name || 'Kam User';
    document.getElementById('drawer-email').textContent = user.email || '';
  }
  loadWorkers();
  document.getElementById('user-section').style.display = '';
  document.getElementById('user-requests-section').classList.add('visible');
  document.getElementById('you-hired-section').classList.add('visible');
  document.getElementById('hired-by-section').classList.remove('visible');
  loadYouHired();
  loadJobs();
}

function showMyJobs() {
  if (isWorkerMode) {
    document.getElementById('hired-by-section').scrollIntoView({ behavior: 'smooth' });
  } else {
    toggleRole();
  }
}

function doLogout() {
  localStorage.removeItem('kam_token');
  localStorage.removeItem('kam_user');
  closeDrawer();
  document.getElementById('dashboard-screen').classList.remove('active');
  document.getElementById('login-screen').classList.add('active');
}

