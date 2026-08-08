// ===================== Notifications =====================
let notifPollTimer = null;

const NOTIF_ICONS = {
  job_accepted: '✅',
  job_declined: '❌',
  job_hired: '🎉',
  job_completed: '📋',
  payment_received: '💰',
  booking_cancelled: '🚫',
  new_review: '⭐',
};

function notifIcon(type) {
  return NOTIF_ICONS[type] || '🔔';
}

function notifTimeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Called once from showDashboard() after login/session-resume. Fetches the
// unread count right away, then polls every 30s so the badge stays fresh
// without the user having to reopen the panel.
function initNotifications() {
  refreshNotifUnreadCount();
  if (notifPollTimer) clearInterval(notifPollTimer);
  notifPollTimer = setInterval(refreshNotifUnreadCount, 30000);
}

function stopNotifications() {
  if (notifPollTimer) clearInterval(notifPollTimer);
  notifPollTimer = null;
  document.getElementById('notif-badge').classList.remove('show');
}

async function refreshNotifUnreadCount() {
  const token = localStorage.getItem('kam_token');
  if (!token) return;
  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/notifications/unread-count`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    const badge = document.getElementById('notif-badge');
    if (data.success && data.count > 0) {
      badge.textContent = data.count > 99 ? '99+' : data.count;
      badge.classList.add('show');
    } else {
      badge.classList.remove('show');
    }
  } catch (err) {
    console.error('Unread count error:', err);
  }
}

async function openNotificationsPanel() {
  document.getElementById('notif-panel').classList.add('open');
  document.getElementById('notif-overlay').classList.add('open');
  await loadNotifications();
}

function closeNotificationsPanel(e) {
  if (e && e.target !== document.getElementById('notif-overlay')) return;
  closeNotificationsPanelDirect();
}
function closeNotificationsPanelDirect() {
  document.getElementById('notif-panel').classList.remove('open');
  document.getElementById('notif-overlay').classList.remove('open');
}

async function loadNotifications() {
  const list = document.getElementById('notif-list');
  const token = localStorage.getItem('kam_token');
  if (!token) {
    list.innerHTML = '<div class="notif-empty">Sign in to see notifications.</div>';
    return;
  }

  list.innerHTML = '<div class="notif-loading">Loading…</div>';
  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/notifications`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (!data.success || !data.notifications || data.notifications.length === 0) {
      list.innerHTML = '<div class="notif-empty">Nothing yet — you\'ll see job, payment, and review updates here.</div>';
      return;
    }

    list.innerHTML = data.notifications.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}" onclick="handleNotifClick(${n.id}, this)">
        <div class="notif-item-icon">${notifIcon(n.type)}</div>
        <div class="notif-item-body">
          <div class="notif-item-title">${escapeHtml(n.title)}</div>
          ${n.message ? `<div class="notif-item-msg">${escapeHtml(n.message)}</div>` : ''}
          <div class="notif-item-time">${notifTimeAgo(n.created_at)}</div>
        </div>
        <button class="notif-item-del" onclick="event.stopPropagation(); deleteNotification(${n.id})" title="Dismiss">×</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Load notifications error:', err);
    list.innerHTML = '<div class="notif-empty">Could not load notifications.</div>';
  }
}

async function handleNotifClick(id, el) {
  if (el.classList.contains('unread')) {
    el.classList.remove('unread');
    await markNotificationRead(id);
    refreshNotifUnreadCount();
  }
}

async function markNotificationRead(id) {
  const token = localStorage.getItem('kam_token');
  if (!token) return;
  try {
    await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + token }
    });
  } catch (err) {
    console.error('Mark read error:', err);
  }
}

async function markAllNotificationsRead() {
  const token = localStorage.getItem('kam_token');
  if (!token) return;
  try {
    await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/notifications/read-all`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
    refreshNotifUnreadCount();
  } catch (err) {
    console.error('Mark all read error:', err);
  }
}

async function deleteNotification(id) {
  const token = localStorage.getItem('kam_token');
  if (!token) return;
  try {
    await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/notifications/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const el = document.querySelector(`.notif-item[data-id="${id}"]`);
    if (el) el.remove();
    refreshNotifUnreadCount();
    const remaining = document.querySelectorAll('#notif-list .notif-item').length;
    if (remaining === 0) {
      document.getElementById('notif-list').innerHTML = '<div class="notif-empty">Nothing yet — you\'ll see job, payment, and review updates here.</div>';
    }
  } catch (err) {
    console.error('Delete notification error:', err);
  }
}
