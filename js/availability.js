let availOn = true;
let currentAvailability = 'avail';

async function loadWorkerAvailability() {
  const token = localStorage.getItem('kam_token');
  if (!token) return;

  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/worker-availability`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.success) {
      currentAvailability = data.availability;
      availOn = (currentAvailability !== 'off');
      updateAvailButton();
    }
  } catch (err) {
    console.log('Could not load availability');
  }
}

function updateAvailButton() {
  const btn = document.getElementById('avail-btn');
  btn.classList.remove('on', 'busy', 'offline');

  if (currentAvailability === 'avail') {
    btn.textContent = 'Available';
    btn.classList.add('on');
  } else if (currentAvailability === 'busy') {
    btn.textContent = 'Busy';
    btn.classList.add('busy');
  } else {
    btn.textContent = 'Offline';
    btn.classList.add('offline');
  }
}

async function toggleAvail() {
  const token = localStorage.getItem('kam_token');
  if (!token) { toast('Please sign in first.'); return; }

  const nextState = { 'avail': 'busy', 'busy': 'off', 'off': 'avail' };
  const newAvailability = nextState[currentAvailability] || 'avail';

  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/worker-availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ availability: newAvailability })
    });
    const data = await res.json();

    if (!data.success) {
      toast(data.message || 'Could not update availability.');
      return;
    }

    currentAvailability = newAvailability;
    availOn = (currentAvailability !== 'off');
    updateAvailButton();

    const msg = {
      'avail': 'You are now Available',
      'busy': 'You are now Busy',
      'off': 'You are now Offline'
    }[currentAvailability];
    toast(msg);

  } catch (err) {
    toast('Could not reach server.');
  }
}
