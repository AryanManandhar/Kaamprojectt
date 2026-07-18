const DEMO_POSTED_JOBS = [
  { id: 101, title: 'Pipe leak fix needed urgently', category: 'Plumber', location: 'Thamel, Kathmandu', budget: 3000, status: 'open' },
  { id: 102, title: 'House deep cleaning', category: 'Cleaner', location: 'Lalitpur', budget: 2500, status: 'accepted' },
  { id: 103, title: 'Electrical wiring repair', category: 'Electrician', location: 'Bhaktapur', budget: 5000, status: 'completed' },
];

function renderPostedJobs(list, jobs) {
  const statusClass = { open: 'status-open', accepted: 'status-accepted', completed: 'status-completed', declined: 'status-declined' };
  list.innerHTML = jobs.map(j => `
    <div class="posted-job-card" id="posted-job-${j.id}">
      <div style="display:flex; align-items:center; gap:14px;">
        <div style="font-size:13px; font-weight:700; color:var(--amber); width:32px; text-align:center;">${j.category ? j.category.substring(0,2).toUpperCase() : 'JB'}</div>
        <div style="flex:1;">
          <div class="posted-job-title">${j.title}${j.location ? ' - ' + j.location : ''}</div>
          <div class="posted-job-sub">${j.category}${j.budget ? ' - Rs ' + j.budget : ''}</div>
          <span class="posted-job-status ${statusClass[j.status] || 'status-open'}">${j.status.charAt(0).toUpperCase() + j.status.slice(1)}</span>
        </div>
        <div class="posted-job-actions">
          <button class="job-btn job-btn-decline" onclick="deletePostedJob(${j.id})">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function loadMyPostedJobs() {
  const list = document.getElementById('my-posted-jobs-list');
  const token = localStorage.getItem('kam_token');
  if (!token) {
    list.innerHTML = '<div style="color:var(--charcoal-mid); font-size:13px; padding:8px 0;">Sign in to see your posted jobs.</div>';
    return;
  }
  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/jobs/mine`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (!data.success || !data.jobs || data.jobs.length === 0) {
      list.innerHTML = '<div style="color:var(--charcoal-mid); font-size:13px; padding:8px 0;">You have not posted any jobs yet.</div>';
      updateJobsDone(0);
      return;
    }
    renderPostedJobs(list, data.jobs);
    const acceptedCount = data.jobs.filter(j => j.status === 'accepted' || j.status === 'completed').length;
    updateJobsDone(acceptedCount);
  } catch (err) {
    console.log('API not available for posted jobs');
    list.innerHTML = '<div style="color:var(--charcoal-mid); font-size:13px; padding:8px 0;">Could not load your posted jobs.</div>';
  }
}

function updateJobsDone(count) {
  const vals = document.querySelectorAll('.earn-val');
  if (vals.length >= 2) {
    vals[1].textContent = count;
  }
}

async function deletePostedJob(jobId) {
  const token = localStorage.getItem('kam_token');
  if (!token) { toast('Please sign in first.'); return; }
  const card = document.getElementById(`posted-job-${jobId}`);
  if (!card) return;
  card.style.opacity = '0.5';
  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (!data.success) { toast(data.message || 'Could not delete.'); card.style.opacity = '1'; return; }
    toast('Job deleted.');
    card.style.transition = 'opacity 0.25s, transform 0.25s';
    card.style.opacity = '0';
    card.style.transform = 'translateX(20px)';
    setTimeout(() => {
      card.remove();
      loadMyPostedJobs();
    }, 250);
  } catch (err) {
    toast('Could not reach server.');
    card.style.opacity = '1';
  }
}

