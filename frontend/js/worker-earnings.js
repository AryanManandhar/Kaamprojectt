async function loadWorkerEarnings() {
  const token = localStorage.getItem('kam_token');
  const vals = document.querySelectorAll('.earn-val');
  if (!token || vals.length < 1) return;

  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/worker-earnings`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.success) {
      vals[0].textContent = `Rs ${Number(data.earnings).toLocaleString('en-IN')}`;
    }
  } catch (err) {
    console.log('Could not load worker earnings.');
  }
}

