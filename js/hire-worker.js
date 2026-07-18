async function hireWorker(jobId) {
  const token = localStorage.getItem('kam_token');
  if (!token) {
    toast('Please sign in first.');
    return;
  }

  const card = document.getElementById(`job-card-${jobId}`);
  const button = card ? card.querySelector('.job-btn') : null;
  if (button) button.disabled = true;

  try {
    const jobRes = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/jobs`);
    const jobData = await jobRes.json();
    const job = jobData.jobs.find(j => j.id === jobId);
    if (!job) {
      toast('Job not found.');
      if (button) button.disabled = false;
      return;
    }

    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({ 
        job_id: jobId,
        worker_id: job.user_id
      }),
    });
    const data = await res.json();

    if (!data.success) {
      toast(data.message || 'Could not hire worker.');
      if (button) button.disabled = false;
      return;
    }

    toast('Worker hired successfully!');
    if (card) {
      card.style.transition = 'opacity 0.25s, transform 0.25s';
      card.style.opacity = '0';
      card.style.transform = 'translateX(20px)';
      setTimeout(() => card.remove(), 250);
    }
    loadYouHired();
  } catch (err) {
    toast('Could not reach the server.');
    if (button) button.disabled = false;
  }
}

