async function loadWorkers() {
  try {
    const base = window.API_BASE || 'http://localhost:4000';
    const res = await fetch(`${base}/api/workers`);
    const data = await res.json();
    if (data.success) {
      WORKERS = data.workers.map(w => ({
        name: w.name,
        cat: w.category,
        rating: parseFloat(w.rating),
        jobs: w.jobs_completed,
        houses: w.houses_served,
        avail: w.availability,
        bio: w.bio,
        skills: w.skills,
        reviews: w.reviews,
        photo: photoFor(w.name),
        yr: w.years_experience,
      }));
      filterWorkers();
    } else {
      console.error('Failed to load workers:', data.message);
      WORKERS = DEMO_WORKERS.map(w => ({ ...w, photo: photoFor(w.name) }));
      filterWorkers();
    }
  } catch (err) {
    console.log('API not available, using demo workers');
    WORKERS = DEMO_WORKERS.map(w => ({ ...w, photo: photoFor(w.name) }));
    filterWorkers();
  }
}

function starsHTML(r) {
  let h = '';
  for (let i=1;i<=5;i++) h += `<span class="star ${i<=Math.round(r)?'filled':'empty'}">&#9733;</span>`;
  return h;
}
function availLabel(a) {
  return {avail:'Available',busy:'Busy',off:'Offline'}[a];
}

function renderWorkers(list) {
  const grid = document.getElementById('workers-grid');
  grid.innerHTML = list.map((w,i) => `
    <div class="worker-card" onclick="openModal(${WORKERS.indexOf(w)})">
      <div class="worker-avail-badge ${w.avail}" title="${availLabel(w.avail)}"></div>
      <img class="worker-avatar" src="${w.photo}" alt="${w.name}" loading="lazy">
      <div class="worker-name">${w.name}</div>
      <div class="worker-category">${w.cat}</div>
      <div class="worker-stars">${starsHTML(w.rating)}</div>
      <div class="worker-meta">
        <span class="meta-chip">${w.rating} / 5</span>
        <span class="meta-chip">${w.jobs} jobs</span>
        <span class="meta-chip">${w.houses} houses</span>
      </div>
    </div>
  `).join('');
}

function filterWorkers() {
  const q = document.getElementById('search-input').value.toLowerCase();
  let list = WORKERS.filter(w => {
    const matchCat = currentFilter === 'All' || w.cat === currentFilter;
    const matchQ = !q || w.name.toLowerCase().includes(q) || w.cat.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  renderWorkers(list);
}

function filterByTag(el, tag) {
  document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  currentFilter = tag;
  filterWorkers();
}

