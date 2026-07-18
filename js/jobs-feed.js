async function loadJobs() {
  const list = document.getElementById('user-requests-list');
  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/jobs`);
    const data = await res.json();
    if (!data.success || data.jobs.length === 0) {
      list.innerHTML = '<div style="color:var(--charcoal-mid); font-size:13px; padding:8px 0;">No worker deals available right now.</div>';
      return;
    }
    list.innerHTML = data.jobs.map(j => `
      <div class="job-request-card" id="job-card-${j.id}">
        <div style="font-size:13px; font-weight:700; color:var(--amber); width:32px; text-align:center;">${j.category ? j.category.substring(0,2).toUpperCase() : 'JB'}</div>
        <div style="flex:1;">
          <div class="job-req-title">${j.title}${j.location ? ' - ' + j.location : ''}</div>
          <div class="job-req-sub">${j.poster_name}${j.budget ? ' - Rs ' + j.budget : ''}</div>
        </div>
        <div class="job-req-actions">
          <button class="job-btn job-btn-accept" onclick="hireWorker(${j.id})">Hire</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = '<div style="color:var(--red); font-size:13px;">Could not load worker deals.</div>';
  }
}

