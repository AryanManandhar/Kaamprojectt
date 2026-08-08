// ===================== Reviews =====================
let reviewBookingId = null;
let reviewStars = 0;

function openReviewModal(bookingId, workerName) {
  reviewBookingId = bookingId;
  reviewStars = 0;
  document.getElementById('review-worker-name').textContent = workerName || 'this worker';
  document.getElementById('review-comment').value = '';
  renderStarPicker();
  document.getElementById('review-overlay').classList.add('open');
}
function closeReviewModal(e) { if (e.target === document.getElementById('review-overlay')) closeReviewModalDirect(); }
function closeReviewModalDirect() { document.getElementById('review-overlay').classList.remove('open'); }

function setReviewStars(n) {
  reviewStars = n;
  renderStarPicker();
}

function renderStarPicker() {
  const wrap = document.getElementById('review-star-picker');
  wrap.innerHTML = [1, 2, 3, 4, 5].map(n => `
    <button type="button" class="star-btn ${n <= reviewStars ? 'filled' : ''}" onclick="setReviewStars(${n})">${n <= reviewStars ? '★' : '☆'}</button>
  `).join('');
}

async function submitReview() {
  const token = localStorage.getItem('kam_token');
  if (!token || !reviewBookingId) {
    toast('Please sign in first.');
    return;
  }
  if (reviewStars < 1) {
    toast('Pick a star rating first.');
    return;
  }

  const comment = document.getElementById('review-comment').value.trim();
  const btn = document.getElementById('review-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({ booking_id: reviewBookingId, rating: reviewStars, comment: comment || null }),
    });
    const data = await res.json();

    if (!data.success) {
      toast(data.message || 'Could not submit review.');
      return;
    }

    closeReviewModalDirect();
    toast('Thanks for the review!');
    loadYouHired();
  } catch (err) {
    console.error('Submit review error:', err);
    toast('Could not reach the server.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Review';
  }
}
