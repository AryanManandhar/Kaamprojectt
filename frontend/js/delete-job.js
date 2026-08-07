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

