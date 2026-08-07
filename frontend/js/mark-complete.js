async function markJobComplete(bookingId) {
  const token = localStorage.getItem('kam_token');
  if (!token) {
    toast('Please sign in first.');
    return;
  }
  if (!confirm('Mark this job as completed? The hirer will be notified to pay.')) return;

  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({ status: 'completed' }),
    });
    const data = await res.json();
    if (!data.success) {
      toast(data.message || 'Could not update booking.');
      return;
    }
    toast('Job marked complete. Hirer notified.');
    loadHiredBy();
  } catch (err) {
    toast('Could not reach the server.');
  }
}

