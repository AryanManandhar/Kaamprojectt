async function loadYouHired() {
  const list = document.getElementById('you-hired-list');
  const section = document.getElementById('you-hired-section');
  const token = localStorage.getItem('kam_token');

  if (!token) {
    list.innerHTML = '<div class="no-hired-msg">Sign in to see who you hired.</div>';
    return;
  }

  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/bookings/user`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (!data.success || !data.bookings || data.bookings.length === 0) {
      list.innerHTML = '<div class="no-hired-msg">You have not hired anyone yet.</div>';
      return;
    }

    list.innerHTML = data.bookings.map(b => {
      const hiredDate = new Date(b.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const statusClass = `hired-status-${b.status}`;
      return `
        <div class="hired-card">
          <div class="hired-worker-name">${b.worker_name}</div>
          <div class="hired-job-title">for <span style="color:var(--amber);font-weight:700;">${b.category}:</span> <strong>${b.title}</strong></div>
          <div class="hired-meta-row">
            <span class="hired-meta-chip">${b.location || ''}</span>
            ${b.budget ? `<span class="hired-meta-chip">Rs ${b.budget}</span>` : ''}
          </div>
          <div class="hired-date">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Hired on: ${hiredDate}
          </div>
          <span class="hired-status ${statusClass}">${b.status}</span>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading hired workers:', err);
    list.innerHTML = '<div class="no-hired-msg">Could not load your hired workers.</div>';
  }
}

