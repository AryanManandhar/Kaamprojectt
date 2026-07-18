async function loadHiredBy() {
  const list = document.getElementById('hired-by-list');
  const section = document.getElementById('hired-by-section');
  const token = localStorage.getItem('kam_token');

  if (!token) {
    list.innerHTML = '<div class="no-hired-by-msg">Sign in to see who hired you.</div>';
    return;
  }

  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/bookings/worker`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (!data.success || !data.bookings || data.bookings.length === 0) {
      list.innerHTML = '<div class="no-hired-by-msg">No one has hired you yet.</div>';
      return;
    }

    list.innerHTML = data.bookings.map(b => {
      const hiredDate = new Date(b.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const statusClass = `hired-by-status-${b.status}`;
      return `
        <div class="hired-by-card">
          <div class="hired-by-name">${b.hirer_name}</div>
          <div class="hired-by-job-title">for <span style="color:var(--amber);font-weight:700;">${b.category}:</span> <strong>${b.title}</strong></div>
          <div class="hired-by-meta-row">
            <span class="hired-by-meta-chip">${b.location || ''}</span>
            ${b.budget ? `<span class="hired-by-meta-chip">Rs ${b.budget}</span>` : ''}
          </div>
          <div class="hired-by-date">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Hired on: ${hiredDate}
          </div>
          <span class="hired-by-status ${statusClass}">${b.status}</span>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading hired-by data:', err);
    list.innerHTML = '<div class="no-hired-by-msg">Could not load who hired you.</div>';
  }
}

