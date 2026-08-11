function openModal(idx) {
  const w = WORKERS[idx];
  document.getElementById('modal-avatar').innerHTML = `<img src="${w.photo}" alt="${w.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  document.getElementById('modal-name').innerHTML = `${w.name} ${w.isReal ? '<span class="worker-verified-badge" style="position:static;display:inline-block;vertical-align:middle;margin-left:6px;" title="Rated from a real Kam booking">✓ Verified</span>' : ''}`;
  document.getElementById('modal-cat').textContent = w.cat;
  document.getElementById('modal-rating').textContent = w.rating + ' / 5';
  document.getElementById('modal-jobs').textContent = w.jobs;
  document.getElementById('modal-houses').textContent = w.houses;
  document.getElementById('modal-bio').textContent = w.bio;
  document.getElementById('modal-skills').innerHTML = w.skills.map(s=>`<span class="skill-tag">${s}</span>`).join('');
  document.getElementById('modal-reviews').innerHTML = w.reviews.length ? w.reviews.map(r=>`
    <div class="review-item">
      <div class="review-author">${escapeHtml(r.a)} ${starsHTML(r.rating || 5)}</div>
      <div class="review-text">${escapeHtml(r.t)}</div>
    </div>
  `).join('') : `<div class="review-item"><div class="review-text">No reviews yet.</div></div>`;
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal(e) { if(e.target === document.getElementById('modal-overlay')) closeModalDirect(); }
function closeModalDirect() { document.getElementById('modal-overlay').classList.remove('open'); }

