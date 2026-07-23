let isWorkerMode = false;
function toggleRole() {
  isWorkerMode = !isWorkerMode;
  const track = document.getElementById('role-toggle');
  const uLabel = document.getElementById('user-label');
  const wLabel = document.getElementById('worker-label');
  const earningsBar = document.getElementById('earnings-bar');
  const myJobsSection = document.getElementById('my-jobs-section');
  const userRequests = document.getElementById('user-requests-section');
  const userSection = document.getElementById('user-section');
  const navActions = document.getElementById('nav-actions');
  const postedJobsSection = document.getElementById('my-posted-jobs-section');
  const youHiredSection = document.getElementById('you-hired-section');

  const hiredBySection = document.getElementById('hired-by-section');

  if (isWorkerMode) {
    track.classList.add('worker-mode');
    uLabel.classList.remove('active'); wLabel.classList.add('active');
    earningsBar.classList.add('visible');
    postedJobsSection.classList.add('visible');
    hiredBySection.classList.add('visible');
    userRequests.classList.remove('visible');
    youHiredSection.classList.remove('visible');
    loadMyPostedJobs();
    loadHiredBy();
    loadWorkerAvailability();
    loadWorkerEarnings();
    userSection.style.display = 'none';
    navActions.innerHTML = '<button class="bottom-btn btn-post" onclick="openPostJobModal()">+ Post a Job</button>';
  } else {
    track.classList.remove('worker-mode');
    wLabel.classList.remove('active'); uLabel.classList.add('active');
    earningsBar.classList.remove('visible');
    postedJobsSection.classList.remove('visible');
    hiredBySection.classList.remove('visible');
    userRequests.classList.add('visible');
    youHiredSection.classList.add('visible');
    loadYouHired();
    loadJobs();
    userSection.style.display = '';
    navActions.innerHTML = '';
  }
}

