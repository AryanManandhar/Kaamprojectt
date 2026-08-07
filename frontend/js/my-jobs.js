async function loadMyJobs() {
  const list = document.getElementById('my-jobs-list');
  const token = localStorage.getItem('kam_token');
  if (!token) {
    list.innerHTML = '<div style="color:var(--charcoal-mid); font-size:13px; padding:8px 0;">Sign in to see your jobs.</div>';
    return;
  }
  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/my-jobs`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (!data.success || !data.jobs || data.jobs.length === 0) {
      list.innerHTML = '<div style="color:var(--charcoal-mid); font-size:13px; padding:8px 0;">No jobs assigned to you yet.</div>';
      return;
    }
    const statusClass = { open: 'status-open', accepted: 'status-accepted', completed: 'status-completed', declined: 'status-declined' };
    list.innerHTML = data.jobs.map(j => `
      <div class="my-job-card">
        <div class="my-job-title">${j.title}${j.location ? ' - ' + j.location : ''}</div>
        <div class="my-job-sub">${j.category}${j.budget ? ' - Rs ' + j.budget : ''}</div>
        <span class="my-job-status ${statusClass[j.status] || 'status-open'}">${j.status.charAt(0).toUpperCase() + j.status.slice(1)}</span>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = '<div style="color:var(--red); font-size:13px;">Could not load your jobs.</div>';
  }
}

