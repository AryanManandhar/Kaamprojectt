function openModal(idx) {
  const w = WORKERS[idx];
  document.getElementById('modal-avatar').innerHTML = `<img src="${w.photo}" alt="${w.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  document.getElementById('modal-name').textContent = w.name;
  document.getElementById('modal-cat').textContent = w.cat;
  document.getElementById('modal-rating').textContent = w.rating + ' / 5';
  document.getElementById('modal-jobs').textContent = w.jobs;
  document.getElementById('modal-houses').textContent = w.houses;
  document.getElementById('modal-bio').textContent = w.bio;
  document.getElementById('modal-skills').innerHTML = w.skills.map(s=>`<span class="skill-tag">${s}</span>`).join('');
  document.getElementById('modal-reviews').innerHTML = w.reviews.map(r=>`
    <div class="review-item">
      <div class="review-author">${r.a} ${starsHTML(5)}</div>
      <div class="review-text">${r.t}</div>
    </div>
  `).join('');
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal(e) { if(e.target === document.getElementById('modal-overlay')) closeModalDirect(); }
function closeModalDirect() { document.getElementById('modal-overlay').classList.remove('open'); }

