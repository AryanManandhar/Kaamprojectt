function openPostJobModal() {
  const token = localStorage.getItem('kam_token');
  if (!token) {
    toast('Please sign in first to post a job.');
    return;
  }
  hidePostJobError();
  document.getElementById('job-title').value = '';
  document.getElementById('job-category').value = '';
  document.getElementById('job-location').value = '';
  document.getElementById('job-budget').value = '';
  document.getElementById('job-description').value = '';
  document.getElementById('post-job-overlay').classList.add('open');
}
function closePostJobModal(e) {
  if (e.target === document.getElementById('post-job-overlay')) closePostJobDirect();
}
function closePostJobDirect() {
  document.getElementById('post-job-overlay').classList.remove('open');
}
function showPostJobError(msg) {
  const el = document.getElementById('post-job-error');
  el.textContent = msg;
  el.classList.add('show');
}
function hidePostJobError() {
  document.getElementById('post-job-error').classList.remove('show');
}

async function submitJobPost() {
  hidePostJobError();
  const token = localStorage.getItem('kam_token');
  if (!token) {
    showPostJobError('Please sign in first to post a job.');
    return;
  }

  const title = document.getElementById('job-title').value.trim();
  const category = document.getElementById('job-category').value;
  const location = document.getElementById('job-location').value.trim();
  const budget = document.getElementById('job-budget').value;
  const description = document.getElementById('job-description').value.trim();

  if (!title || !category) {
    showPostJobError('Please enter a title and select a category.');
    return;
  }

  const btn = document.getElementById('post-job-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Posting...';

  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({
        title,
        category,
        description: description || null,
        location: location || null,
        budget: budget ? Number(budget) : null,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      showPostJobError(data.message || 'Something went wrong. Please try again.');
      return;
    }
    closePostJobDirect();
    toast('Job posted successfully!');
    if (isWorkerMode) loadMyPostedJobs();
  } catch (err) {
    showPostJobError('Could not reach the server. Is the API running on ' + (window.API_BASE || 'http://localhost:4000') + '?');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Post Job';
  }
}

