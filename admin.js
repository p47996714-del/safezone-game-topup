const $ = (id) => document.getElementById(id);
let ADMIN = { pwd: '', username: '', adminInfo: null, currentTab: 'dash', filterDep: 'pending', filterOrd: 'pending' };
let revenueChartInstance = null;
let usersChartInstance = null;
let lastPendingDep = 0;
let lastPendingOrd = 0;

// ===============================
// CORE
// ===============================
function toast(msg, type = '') {
  const t = $('toast'); t.textContent = msg; t.className = 'toast ' + type; t.classList.remove('hidden');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.add('hidden'), 3000);
}
function showModal(html) { $('modalBody').innerHTML = html; $('modal').classList.remove('hidden'); }
function closeModal() { $('modal').classList.add('hidden'); }
window.closeModal = closeModal;
function fmt(n) { return Number(n || 0).toLocaleString(); }
function fmtTime(ts) { return new Date(ts * 1000).toLocaleString(); }
function fmtDate(ts) { return new Date(ts * 1000).toLocaleDateString(); }

async function api(path, body = null, method = 'POST') {
  const headers = {
    'Content-Type': 'application/json',
    'X-Admin-Password': ADMIN.pwd,
    'X-Admin-Username': ADMIN.username || 'admin'
  };
  const opts = { method, headers };
  if (body && method === 'POST') opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (res.status === 401) { logout(); throw new Error('unauthorized'); }
  return res.json();
}

// ===============================
// SOUND & PUSH
// ===============================
function playNotification() { const a = $('notifySound'); if (a) a.play().catch(e => {}); }
function requestNotificationPermission() { if ('Notification' in window) Notification.requestPermission(); }
function sendPushNotification(title, body) { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body }); }
function checkNewAlerts(stats) {
  if (stats.pendingDeposits > lastPendingDep || stats.pendingOrders > lastPendingOrd) {
    if (lastPendingDep !== 0 || lastPendingOrd !== 0) { playNotification(); sendPushNotification('🔔 Admin Alert', 'New pending orders or deposits!'); }
    lastPendingDep = stats.pendingDeposits; lastPendingOrd = stats.pendingOrders;
  }
}

// ===============================
// LOGIN
// ===============================
async function doLogin() {
  const username = ($('adminUser').value || '').toLowerCase().trim() || 'admin';
  const pwd = $('pwd').value;
  if (!pwd) return;
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pwd })
    }).then(r => r.json());

    if (res.ok) {
      ADMIN.pwd = pwd;
      ADMIN.username = (res.admin && res.admin.username) || username;
      ADMIN.adminInfo = res.admin;
      localStorage.setItem('admin_pwd', pwd);
      localStorage.setItem('admin_username', ADMIN.username);
      localStorage.setItem('admin_info', JSON.stringify(res.admin || {}));
      enterAdmin();
      requestNotificationPermission();
      updateAdminBadge();
    } else {
      $('loginError').textContent = res.error || 'မအောင်မြင်ပါ';
      $('loginError').classList.remove('hidden');
    }
  } catch(e) {
    $('loginError').textContent = 'Server error';
    $('loginError').classList.remove('hidden');
  }
}
$('loginBtn').addEventListener('click', doLogin);
$('pwd').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
$('adminUser').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

function logout() {
  localStorage.removeItem('admin_pwd');
  localStorage.removeItem('admin_username');
  localStorage.removeItem('admin_info');
  ADMIN.pwd = ''; ADMIN.username = ''; ADMIN.adminInfo = null;
  $('adminScreen').classList.add('hidden');
  $('loginScreen').classList.remove('hidden');
  $('pwd').value = '';
}
$('logoutBtn').addEventListener('click', logout);

function enterAdmin() {
  $('loginScreen').classList.add('hidden');
  $('adminScreen').classList.remove('hidden');
  loadTab('dash');
}

function updateAdminBadge() {
  const b = $('currentAdminBadge');
  if (!b) return;
  const info = ADMIN.adminInfo || {};
  const name = info.name || ADMIN.username || 'admin';
  const role = info.role === 'view' ? '👁 View' : (info.isSuper ? '👑 Super' : '🔵 Full');
  b.textContent = name + ' • ' + role;
}

// Auto-login
(function() {
  const saved = localStorage.getItem('admin_pwd');
  const savedUser = localStorage.getItem('admin_username') || 'admin';
  const savedInfo = localStorage.getItem('admin_info');
  if (saved) {
    ADMIN.pwd = saved;
    ADMIN.username = savedUser;
    if (savedInfo) try { ADMIN.adminInfo = JSON.parse(savedInfo); } catch(e) {}
    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: savedUser, password: saved })
    }).then(r => r.json()).then(res => {
      if (res.ok) {
        ADMIN.username = (res.admin && res.admin.username) || savedUser;
        ADMIN.adminInfo = res.admin;
        enterAdmin(); requestNotificationPermission(); updateAdminBadge();
      } else logout();
    }).catch(() => logout());
  }
})();

// ===============================
// TABS
// ===============================
document.querySelectorAll('.tab').forEach(t => { t.addEventListener('click', () => loadTab(t.dataset.tab)); });
function loadTab(name) {
  ADMIN.currentTab = name;
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(x => x.classList.toggle('active', x.id === 'tab-' + name));
  const map = {
    dash: loadDash, analytics: loadAnalytics, deposits: loadDeposits, orders: loadOrders,
    users: loadUsers, items: loadItems, banners: loadBanners, promos: loadPromos,
    referrals: loadReferrals, points: loadPointsHistory, spins: loadSpins,
    chats: loadChats, broadcast: () => { $('bcastStatus').textContent = ''; },
    settings: loadSettings, admins: loadAdmins, logs: loadLogs
  };
  if (map[name]) map[name]();
}

// ===============================
// DASHBOARD
// ===============================
async function loadDash() {
  const res = await api('/api/admin/stats', null, 'GET');
  if (!res.ok) return;
  $('sUsers').textContent = fmt(res.stats.users);
  $('sBalance').textContent = fmt(res.totalBalance);
  $('sPoints').textContent = fmt(res.totalPoints || 0);
  $('sPendingDep').textContent = fmt(res.stats.pendingDeposits);
  $('sPendingOrd').textContent = fmt(res.stats.pendingOrders);
  $('sTotalDep').textContent = fmt(res.stats.totalDeposit);
  $('sSales').textContent = fmt(res.stats.totalSales);
  $('sItems').textContent = fmt(res.itemsCount);
  $('sChats').textContent = fmt(res.unreadChats);
  const btn = $('toggleAppBtn');
  btn.textContent = res.enabled ? '🟢 ON' : '🔴 OFF';
  btn.className = 'btn-toggle' + (res.enabled ? '' : ' off');
  checkNewAlerts(res.stats);
  loadCharts();
}
async function loadCharts() {
  const revRes = await api('/api/admin/revenue?days=7', null, 'GET');
  if (revRes.ok) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(ctx, { type: 'line', data: { labels: revRes.data.map(d => d.date), datasets: [{ label: 'Sales', data: revRes.data.map(d => d.sales), borderColor: '#2ea6ff', backgroundColor: 'rgba(46,166,255,0.1)', tension: 0.3, fill: true }, { label: 'Deposits', data: revRes.data.map(d => d.deposits), borderColor: '#27ae60', backgroundColor: 'rgba(39,174,96,0.1)', tension: 0.3, fill: true }] }, options: { responsive: true, plugins: { legend: { labels: { color: '#e5e7eb' } } }, scales: { x: { ticks: { color: '#8a90a0' } }, y: { ticks: { color: '#8a90a0' } } } } });
  }
  const anRes = await api('/api/admin/analytics', null, 'GET');
  if (anRes.ok) {
    const ctx = document.getElementById('usersChart').getContext('2d');
    if (usersChartInstance) usersChartInstance.destroy();
    usersChartInstance = new Chart(ctx, { type: 'bar', data: { labels: anRes.dailyReg.map(d => d.date), datasets: [{ label: 'New Users', data: anRes.dailyReg.map(d => d.count), backgroundColor: '#2ea6ff', borderRadius: 6 }] }, options: { responsive: true, plugins: { legend: { labels: { color: '#e5e7eb' } } }, scales: { x: { ticks: { color: '#8a90a0' } }, y: { ticks: { color: '#8a90a0' } } } } });
  }
}
$('toggleAppBtn').addEventListener('click', async () => { const res = await api('/api/admin/toggle-miniapp', {}); if (res.ok) { toast(res.enabled ? 'App ON' : 'App OFF', 'success'); loadDash(); } });
$('backupBtn').addEventListener('click', async () => { toast('💾 ...'); const res = await api('/api/admin/backup', {}, 'POST'); if (res.ok) toast('✅ Backup sent', 'success'); });

// ===============================
// ANALYTICS
// ===============================
async function loadAnalytics() {
  const res = await api('/api/admin/analytics', null, 'GET');
  if (!res.ok) return;
  $('aTotalUsers').textContent = fmt(res.totalUsers);
  $('aActiveUsers').textContent = fmt(res.activeUsers);
  $('aTotalOrders').textContent = fmt(res.totalOrders);
  $('aCompletedOrders').textContent = fmt(res.completedOrders);
  $('aReferrals').textContent = fmt(res.totalReferrals);
  $('aSpins').textContent = fmt(res.totalSpins);
  const sb = $('topSpendersList'); sb.innerHTML = '';
  res.topUsers.forEach(u => {
    const c = document.createElement('div'); c.className = 'card'; c.style.padding = '10px 14px';
    c.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:13px"><div><b>#' + u.id + ' ' + u.name + '</b><br><span style="color:#8a90a0">' + u.phone + '</span></div><div style="text-align:right"><span style="color:#27ae60;font-weight:bold">' + fmt(u.totalSpent) + ' Ks</span><br><span style="color:#8a90a0;font-size:11px">⭐ ' + fmt(u.points) + ' | ' + u.orderCount + ' orders</span></div></div>';
    sb.appendChild(c);
  });
  const ib = $('topItemsList'); ib.innerHTML = '';
  res.topItems.forEach(i => {
    const c = document.createElement('div'); c.className = 'card'; c.style.padding = '10px 14px';
    c.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:13px"><div><b>' + i.name + '</b><br><span style="color:#8a90a0">' + i.game_id.toUpperCase() + '</span></div><div style="text-align:right"><span style="color:#2ea6ff;font-weight:bold">' + fmt(i.revenue) + ' Ks</span><br><span style="color:#8a90a0;font-size:11px">' + i.count + ' sold</span></div></div>';
    ib.appendChild(c);
  });
}

// ===============================
// DEPOSITS
// ===============================
document.querySelectorAll('#tab-deposits .filter').forEach(f => {
  f.addEventListener('click', () => {
    document.querySelectorAll('#tab-deposits .filter').forEach(x => x.classList.remove('active'));
    f.classList.add('active'); ADMIN.filterDep = f.dataset.status; loadDeposits();
  });
});
async function loadDeposits() {
  const box = $('depositsList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/deposits?status=' + ADMIN.filterDep, null, 'GET');
  if (!res.ok || !res.deposits.length) { box.innerHTML = '<div class="empty">📥 Deposit မရှိပါ။</div>'; return; }
  box.innerHTML = '';
  res.deposits.forEach(d => {
    const c = document.createElement('div'); c.className = 'card';
    c.innerHTML = '<div class="card-header"><div><div class="card-title">#' + d.id + ' • ' + d.user_name + '</div><div class="card-meta">📱 ' + d.user_phone + '<br>🏦 ' + d.method + '<br>⏰ ' + fmtTime(d.created_at) + '</div></div><div style="text-align:right"><div class="card-price">' + fmt(d.amount) + ' Ks</div><div class="status-badge status-' + d.status + '">' + d.status + '</div></div></div>' + (d.status === 'pending' ? '<div class="card-actions"><button class="btn-ok" onclick="approveDep(' + d.id + ')">✅ Approve</button><button class="btn-no" onclick="rejectDep(' + d.id + ')">❌ Reject</button></div>' : '');
    box.appendChild(c);
  });
}
window.approveDep = async (id) => { if (!confirm('Approve #' + id + '?')) return; const res = await api('/api/admin/deposit/approve', { deposit_id: id }); if (res.ok) { toast('✅ Approved', 'success'); loadDeposits(); } else toast(res.error || 'Error', 'error'); };
window.rejectDep = async (id) => { if (!confirm('Reject #' + id + '?')) return; const res = await api('/api/admin/deposit/reject', { deposit_id: id }); if (res.ok) { toast('❌ Rejected', 'success'); loadDeposits(); } else toast(res.error || 'Error', 'error'); };

// ===============================
// ORDERS
// ===============================
document.querySelectorAll('#tab-orders .filter').forEach(f => {
  f.addEventListener('click', () => {
    document.querySelectorAll('#tab-orders .filter').forEach(x => x.classList.remove('active'));
    f.classList.add('active'); ADMIN.filterOrd = f.dataset.status; loadOrders();
  });
});
async function loadOrders() {
  const box = $('ordersList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/orders?status=' + ADMIN.filterOrd, null, 'GET');
  if (!res.ok || !res.orders.length) { box.innerHTML = '<div class="empty">🛒 Order မရှိပါ။</div>'; return; }
  box.innerHTML = '';
  res.orders.forEach(o => {
    let info = o.needs_account ? '⚠️ App Premium' : ('🆔 ' + (o.game_account || '-') + (o.server_id ? ' • 🌐 ' + o.server_id : ''));
    const c = document.createElement('div'); c.className = 'card';
    c.innerHTML = '<div class="card-header"><div><div class="card-title">#' + o.id + ' • ' + o.item_name + '</div><div class="card-meta">👤 ' + o.user_name + '<br>📱 ' + o.user_phone + '<br>🎮 ' + o.game_id + '<br>' + info + '<br>⏰ ' + fmtTime(o.created_at) + '</div></div><div style="text-align:right"><div class="card-price">' + fmt(o.price) + ' Ks</div><div class="status-badge status-' + o.status + '">' + o.status + '</div></div></div>' + (o.status === 'pending' ? '<div class="card-actions"><button class="btn-ok" onclick="completeOrder(' + o.id + ')">✅ Complete</button><button class="btn-no" onclick="refundOrder(' + o.id + ')">❌ Refund</button></div>' : '');
    box.appendChild(c);
  });
}
window.completeOrder = (id) => { showModal('<h2>✅ Complete Order #' + id + '</h2><label>Account Info</label><textarea id="accInfo" rows="5" placeholder="📧 user@example.com&#10;🔑 password123"></textarea><button class="btn-submit" onclick="confirmComplete(' + id + ')">📤 Complete & Send</button>'); };
window.confirmComplete = async (id) => { const info = $('accInfo').value; const res = await api('/api/admin/order/complete', { order_id: id, account_info: info }); if (res.ok) { toast('✅ Complete', 'success'); closeModal(); loadOrders(); } else toast(res.error || 'Error', 'error'); };
window.refundOrder = async (id) => { if (!confirm('Refund #' + id + '?')) return; const res = await api('/api/admin/order/refund', { order_id: id }); if (res.ok) { toast('❌ Refunded', 'success'); loadOrders(); } else toast(res.error || 'Error', 'error'); };

// ===============================
// USERS
// ===============================
$('userSearch').addEventListener('input', () => loadUsers());
async function loadUsers() {
  const q = $('userSearch').value.trim(); const box = $('usersList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/users?q=' + encodeURIComponent(q), null, 'GET');
  if (!res.ok || !res.users.length) { box.innerHTML = '<div class="empty">👥 User မရှိပါ။</div>'; return; }
  box.innerHTML = '';
  res.users.forEach(u => {
    const c = document.createElement('div'); c.className = 'card'; const safeName = (u.name || u.first_name || '').replace(/'/g, '');
    c.innerHTML = '<div class="card-header"><div><div class="card-title">#' + u.id + ' ' + (u.name || u.first_name || '-') + ' ' + (u.banned ? '<span class="status-badge status-banned">BANNED</span>' : '') + '</div><div class="card-meta">📱 ' + (u.phone || '-') + '<br>🆔 TG: ' + u.telegram_id + '<br>🎁 Ref: ' + (u.referral_code || '-') + '<br>📅 ' + fmtDate(u.created_at || 0) + '</div></div><div style="text-align:right"><div class="card-price">' + fmt(u.balance) + ' Ks</div><div style="color:#f39c12;font-weight:bold;font-size:13px;margin-top:4px">⭐ ' + fmt(u.points) + ' pts</div><div style="color:#e74c3c;font-weight:bold;font-size:12px">🎰 ' + fmt(u.spins_available || 0) + ' spins</div></div></div><div class="card-actions"><button class="btn-edit" onclick="adjustBal(' + u.id + ', \'' + safeName + '\')">💰 Balance</button><button class="btn-warn" onclick="adjustPts(' + u.id + ', \'' + safeName + '\')">⭐ Points</button><button class="btn-purple" onclick="adjustSpins(' + u.id + ', \'' + safeName + '\')">🎰 Spins</button><button class="' + (u.banned ? 'btn-ok' : 'btn-no') + '" onclick="toggleBan(' + u.id + ')">' + (u.banned ? '✅ Unban' : '🚫 Ban') + '</button></div>';
    box.appendChild(c);
  });
}
window.adjustBal = (id, name) => { showModal('<h2>💰 Balance — ' + name + '</h2><label>ပမာဏ (+ / -)</label><input id="balAmt" type="number" placeholder="10000 or -5000" /><label>မှတ်ချက်</label><input id="balNote" placeholder="Bonus / Correction" /><button class="btn-submit" onclick="confirmBal(' + id + ')">💾 Save</button>'); };
window.confirmBal = async (id) => { const amount = Number($('balAmt').value); const note = $('balNote').value; if (!amount) return toast('ပမာဏ ထည့်ပါ', 'error'); const res = await api('/api/admin/user/balance', { user_id: id, amount, note }); if (res.ok) { toast('✅ New: ' + fmt(res.newBalance) + ' Ks', 'success'); closeModal(); loadUsers(); } else toast(res.error || 'Error', 'error'); };
window.adjustPts = (id, name) => { showModal('<h2>⭐ Points — ' + name + '</h2><label>Points (+ / -)</label><input id="ptsAmt" type="number" placeholder="100 or -50" /><label>မှတ်ချက်</label><input id="ptsNote" placeholder="Bonus / Correction" /><button class="btn-submit" onclick="confirmPts(' + id + ')">💾 Save</button>'); };
window.confirmPts = async (id) => { const points = Number($('ptsAmt').value); const note = $('ptsNote').value; if (!points) return toast('Points ထည့်ပါ', 'error'); const res = await api('/api/admin/user/points', { user_id: id, points, note }); if (res.ok) { toast('✅ New: ' + fmt(res.newPoints) + ' pts', 'success'); closeModal(); loadUsers(); } else toast(res.error || 'Error', 'error'); };
window.adjustSpins = (id, name) => { showModal('<h2>🎰 Spins — ' + name + '</h2><label>Spins (+ / -)</label><input id="spnAmt" type="number" placeholder="5 or -2" /><label>မှတ်ချက်</label><input id="spnNote" placeholder="Bonus / Correction" /><button class="btn-submit" onclick="confirmSpins(' + id + ')">💾 Save</button>'); };
window.confirmSpins = async (id) => { const spins = Number($('spnAmt').value); const note = $('spnNote').value; if (!spins) return toast('Spins ထည့်ပါ', 'error'); const res = await api('/api/admin/user/spins', { user_id: id, spins, note }); if (res.ok) { toast('✅ New: ' + fmt(res.newSpins) + ' spins', 'success'); closeModal(); loadUsers(); } else toast(res.error || 'Error', 'error'); };
window.toggleBan = async (id) => { if (!confirm('Toggle ban?')) return; const res = await api('/api/admin/user/ban', { user_id: id }); if (res.ok) { toast(res.banned ? '🚫 Banned' : '✅ Unbanned', 'success'); loadUsers(); } else toast(res.error || 'Error', 'error'); };

// ===============================
// ITEMS ⭐ WITH IMAGE UPLOAD
// ===============================
async function loadItems() {
  const box = $('itemsList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/items', null, 'GET'); if (!res.ok) return;
  const byGame = {}; res.items.forEach(i => { if (!byGame[i.game_id]) byGame[i.game_id] = []; byGame[i.game_id].push(i); }); box.innerHTML = '';
  Object.entries(byGame).forEach(([g, list]) => {
    const h = document.createElement('h3'); h.style.cssText = 'margin:16px 0 8px;color:#2ea6ff'; h.textContent = g.toUpperCase() + ' (' + list.length + ')'; box.appendChild(h);
    list.forEach(i => {
      const autoBadge = i.auto_delivery ? '<span class="status-badge status-sold">⚡ AUTO</span>' : '';
      const stockInfo = i.auto_delivery ? ' • 📦 Stock: ' + (i.stock || 0) : '';
      const imgHtml = i.image
        ? '<img src="' + i.image + '" style="width:60px;height:60px;object-fit:cover;border-radius:8px;margin-right:12px;border:1px solid #2a2d36;flex-shrink:0" />'
        : '<div style="width:60px;height:60px;border-radius:8px;background:#0a0c11;display:flex;align-items:center;justify-content:center;margin-right:12px;font-size:24px;border:1px solid #2a2d36;flex-shrink:0">🧾</div>';
      const c = document.createElement('div'); c.className = 'card';
      c.innerHTML = '<div class="card-header"><div style="display:flex;align-items:center;flex:1;min-width:0">' + imgHtml + '<div style="min-width:0"><div class="card-title">#' + i.id + ' ' + (i.category ? '[' + i.category + '] ' : '') + i.name + ' ' + autoBadge + '</div><div class="card-meta">' + (i.active ? '🟢 Active' : '🔴 Hidden') + stockInfo + '</div></div></div><div class="card-price">' + fmt(i.price) + ' Ks</div></div><div class="card-actions"><button class="btn-edit" onclick="editItemImage(' + i.id + ')">📷 ပုံ</button>' + (i.image ? '<button class="btn-gray" onclick="removeItemImage(' + i.id + ')">🚫 ပုံဖျက်</button>' : '') + '<button class="btn-edit" onclick="editPrice(' + i.id + ', ' + i.price + ')">💵 Price</button><button class="btn-purple" onclick="toggleAuto(' + i.id + ')">' + (i.auto_delivery ? '🔴 Auto OFF' : '⚡ Auto ON') + '</button><button class="btn-gray" onclick="toggleItem(' + i.id + ')">' + (i.active ? '🔴 Hide' : '🟢 Show') + '</button><button class="btn-no" onclick="delItem(' + i.id + ')">🗑️ Delete</button></div>';
      box.appendChild(c);
    });
  });
}
window.editPrice = (id, price) => { const np = prompt('New price:', price); if (!np) return; api('/api/admin/item/price', { item_id: id, price: Number(np) }).then(r => { if (r.ok) { toast('✅ Updated', 'success'); loadItems(); } }); };
window.toggleItem = (id) => api('/api/admin/item/toggle', { item_id: id }).then(r => { if (r.ok) loadItems(); });
window.toggleAuto = (id) => api('/api/admin/item/toggle-auto', { item_id: id }).then(r => { if (r.ok) { toast(r.auto_delivery ? '⚡ Auto ON' : '🔴 Auto OFF', 'success'); loadItems(); } });
window.delItem = (id) => { if (!confirm('Delete #' + id + '?')) return; api('/api/admin/item/delete', { item_id: id }).then(r => { if (r.ok) { toast('🗑️ Deleted', 'success'); loadItems(); } }); };

// ⭐ IMAGE UPLOAD FUNCTION
async function uploadItemImage(itemId, file) {
  if (!file) return;
  if (!/^image\//i.test(file.type)) { toast('ပုံဖိုင် သာ ရွေးပါ', 'error'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('ပုံ 5MB ထက် မကြီးရပါ', 'error'); return; }
  const fd = new FormData();
  fd.append('item_id', String(itemId));
  fd.append('image', file);
  toast('⏳ ပုံတင်နေသည်...');
  try {
    const res = await fetch('/api/admin/item/image', {
      method: 'POST',
      headers: {
        'X-Admin-Password': ADMIN.pwd,
        'X-Admin-Username': ADMIN.username || 'admin'
      },
      body: fd
    }).then(r => r.json());
    if (res.ok) {
      toast(res.image ? '✅ ပုံတင်ပြီ' : '🗑️ ပုံဖျက်ပြီ', 'success');
      loadItems();
    } else {
      toast('❌ ' + (res.error || 'Upload failed'), 'error');
    }
  } catch (e) {
    toast('❌ ' + e.message, 'error');
  }
}
window.editItemImage = (itemId) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => { if (input.files[0]) uploadItemImage(itemId, input.files[0]); };
  input.click();
};
window.removeItemImage = async (itemId) => {
  if (!confirm('ဒီ item ရဲ့ ပုံကို ဖျက်မလား?')) return;
  try {
    const fd = new FormData();
    fd.append('item_id', String(itemId));
    toast('⏳ ဖျက်နေသည်...');
    const res = await fetch('/api/admin/item/image', {
      method: 'POST',
      headers: { 'X-Admin-Password': ADMIN.pwd, 'X-Admin-Username': ADMIN.username || 'admin' },
      body: fd
    }).then(r => r.json());
    if (res.ok) { toast('🗑️ ပုံဖျက်ပြီ', 'success'); loadItems(); }
    else toast(res.error || 'Error', 'error');
  } catch (e) { toast(e.message, 'error'); }
};

$('addItemBtn').addEventListener('click', async () => {
  const res = await api('/api/admin/items', null, 'GET'); if (!res.ok) return;
  const gameOpts = res.games.map(g => '<option value="' + g.id + '">' + g.name + '</option>').join('');
  showModal(
    '<h2>➕ Item အသစ်</h2>' +
    '<label>ဂိမ်း</label><select id="newGame">' + gameOpts + '</select>' +
    '<label>နာမည်</label><input id="newName" />' +
    '<label>စျေး (Ks)</label><input id="newPrice" type="number" />' +
    '<label>Category</label><input id="newCat" placeholder="📱 Telegram" />' +
    '<label>Auto Delivery?</label><select id="newAuto"><option value="0">No (Manual)</option><option value="1">Yes (Auto)</option></select>' +
    '<label>📷 ပုံ (Optional)</label>' +
    '<input id="newImage" type="file" accept="image/*" style="padding:10px;background:#0a0c11;color:#fff" />' +
    '<div id="newImagePreview" style="margin-bottom:12px"></div>' +
    '<button class="btn-submit" onclick="confirmAddItem()">💾 Save</button>'
  );
  $('newImage').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) { $('newImagePreview').innerHTML = ''; return; }
    const url = URL.createObjectURL(f);
    $('newImagePreview').innerHTML = '<img src="' + url + '" style="max-width:120px;max-height:120px;border-radius:8px;margin-top:8px;border:1px solid #2a2d36" />';
  });
});
window.confirmAddItem = async () => {
  const game_id = $('newGame').value;
  const name = $('newName').value.trim();
  const price = Number($('newPrice').value);
  const category = $('newCat').value.trim() || null;
  const auto_delivery = Number($('newAuto').value);
  if (!name || !price) return toast('အားလုံး ဖြည့်ပါ', 'error');
  const res = await api('/api/admin/item/add', { game_id, name, price, category, auto_delivery });
  if (!res.ok) return toast(res.error || 'Error', 'error');
  const newId = res.id;
  const imgFile = $('newImage').files[0];
  if (imgFile) {
    await uploadItemImage(newId, imgFile);
  } else {
    toast('✅ #' + newId + ' ဖန်တီးပြီ', 'success');
  }
  closeModal(); loadItems();
};

// ===============================
// BANNERS
// ===============================
async function loadBanners() {
  const box = $('bannersList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/banners', null, 'GET');
  if (!res.ok || !res.banners.length) { box.innerHTML = '<div class="empty">🖼️ Banner မရှိပါ။</div>'; return; }
  box.innerHTML = '';
  res.banners.forEach(b => {
    const c = document.createElement('div'); c.className = 'card';
    c.innerHTML = '<div class="card-header"><div><div class="card-title">' + b.title + '</div><div class="card-meta">' + (b.subtitle || '') + '<br>' + b.color1 + ' → ' + b.color2 + '<br>Status: ' + (b.active ? '🟢 Active' : '🔴 Hidden') + '</div></div><div style="width:80px;height:50px;border-radius:8px;background:linear-gradient(135deg,' + b.color1 + ',' + b.color2 + ')"></div></div><div class="card-actions"><button class="btn-gray" onclick="toggleBanner(' + b.id + ')">' + (b.active ? '🔴 Hide' : '🟢 Show') + '</button><button class="btn-no" onclick="delBanner(' + b.id + ')">🗑️ Delete</button></div>';
    box.appendChild(c);
  });
}
$('addBannerBtn').addEventListener('click', () => {
  showModal('<h2>🖼️ Banner အသစ်</h2><label>Title</label><input id="bnTitle" placeholder="🎉 Welcome" /><label>Subtitle</label><input id="bnSubtitle" placeholder="Fast & Safe" /><label>Color 1</label><input id="bnColor1" type="color" value="#2ea6ff" /><label>Color 2</label><input id="bnColor2" type="color" value="#6a5cff" /><button class="btn-submit" onclick="confirmAddBanner()">💾 Save</button>');
});
window.confirmAddBanner = async () => {
  const title = $('bnTitle').value.trim(); const subtitle = $('bnSubtitle').value.trim(); const color1 = $('bnColor1').value; const color2 = $('bnColor2').value;
  if (!title) return toast('Title ထည့်ပါ', 'error');
  const res = await api('/api/admin/banner/add', { title, subtitle, color1, color2 });
  if (res.ok) { toast('✅ Created', 'success'); closeModal(); loadBanners(); } else toast(res.error || 'Error', 'error');
};
window.toggleBanner = (id) => api('/api/admin/banner/toggle', { banner_id: id }).then(r => { if (r.ok) loadBanners(); });
window.delBanner = (id) => { if (!confirm('Delete?')) return; api('/api/admin/banner/delete', { banner_id: id }).then(r => { if (r.ok) { toast('🗑️ Deleted', 'success'); loadBanners(); } }); };

// ===============================
// PROMOS
// ===============================
async function loadPromos() {
  const box = $('promoList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/promo-codes', null, 'GET');
  if (!res.ok || !res.promos.length) { box.innerHTML = '<div class="empty">🎟️ Promo Code မရှိပါ။</div>'; return; }
  box.innerHTML = '';
  res.promos.forEach(p => {
    const valueText = p.type === 'fixed' ? fmt(p.value) + ' Ks' : p.value + '%';
    const expiry = p.expires_at ? fmtDate(p.expires_at) : 'မရှိ';
    const c = document.createElement('div'); c.className = 'card';
    c.innerHTML = '<div class="card-header"><div><div class="card-title">🎟️ ' + p.code + '</div><div class="card-meta">Bonus: <b style="color:#27ae60">' + valueText + '</b><br>Used: ' + p.used_count + '/' + (p.max_uses || '∞') + '<br>Expires: ' + expiry + '<br>Status: ' + (p.active ? '🟢 Active' : '🔴 Off') + '</div></div></div><div class="card-actions"><button class="btn-gray" onclick="togglePromo(' + p.id + ')">' + (p.active ? '🔴 Off' : '🟢 On') + '</button><button class="btn-no" onclick="delPromo(' + p.id + ')">🗑️ Delete</button></div>';
    box.appendChild(c);
  });
}
$('addPromoBtn').addEventListener('click', () => {
  showModal('<h2>🎟️ Promo Code အသစ်</h2><label>Code</label><input id="pcCode" placeholder="WELCOME10" style="text-transform:uppercase" /><label>Type</label><select id="pcType"><option value="fixed">ငွေသား (Ks)</option><option value="percent">ရာခိုင်နှုန်း (%)</option></select><label>Value</label><input id="pcValue" type="number" placeholder="5000 or 10" /><label>Max Uses (0 = Unlimited)</label><input id="pcMax" type="number" value="0" /><label>Expiry Days (0 = No expiry)</label><input id="pcExpire" type="number" value="0" /><button class="btn-submit" onclick="confirmAddPromo()">💾 Save</button>');
});
window.confirmAddPromo = async () => {
  const code = $('pcCode').value.trim().toUpperCase(); const type = $('pcType').value; const value = Number($('pcValue').value); const max_uses = Number($('pcMax').value); const expireDays = Number($('pcExpire').value);
  if (!code || !value) return toast('Code နဲ့ ပမာဏ ထည့်ပါ', 'error');
  const expires_at = expireDays > 0 ? Math.floor(Date.now() / 1000) + (expireDays * 86400) : null;
  const res = await api('/api/admin/promo-codes/add', { code, type, value, max_uses, expires_at });
  if (res.ok) { toast('✅ Created', 'success'); closeModal(); loadPromos(); } else toast(res.error || 'Error', 'error');
};
window.togglePromo = (id) => api('/api/admin/promo-codes/toggle', { promo_id: id }).then(r => { if (r.ok) loadPromos(); });
window.delPromo = (id) => { if (!confirm('Delete?')) return; api('/api/admin/promo-codes/delete', { promo_id: id }).then(r => { if (r.ok) { toast('🗑️ Deleted', 'success'); loadPromos(); } }); };

// ===============================
// REFERRALS
// ===============================
async function loadReferrals() {
  const box = $('referralsList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/referrals', null, 'GET');
  if (!res.ok) { box.innerHTML = '<div class="empty">Error</div>'; return; }
  const totalBonus = res.referrals.reduce((s, r) => s + Number(r.bonus || 0), 0);
  $('refTotal').textContent = fmt(res.referrals.length);
  $('refBonus').textContent = fmt(totalBonus);
  if (!res.referrals.length) { box.innerHTML = '<div class="empty">🎁 Referral မရှိသေးပါ။</div>'; return; }
  box.innerHTML = '';
  res.referrals.forEach(r => {
    const c = document.createElement('div'); c.className = 'card'; c.style.padding = '10px 14px';
    c.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:13px"><div>👤 <b>' + r.referrer_name + '</b> → <b>' + r.referred_name + '</b><br><span style="color:#8a90a0">' + fmtTime(r.created_at) + '</span></div><div style="text-align:right"><span style="color:#27ae60;font-weight:bold">+' + fmt(r.bonus) + ' Ks</span></div></div>';
    box.appendChild(c);
  });
}

// ===============================
// POINTS
// ===============================
async function loadPointsHistory() {
  const box = $('pointsHistoryList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const histRes = await api('/api/admin/points-history', null, 'GET');
  if (!histRes.ok) { box.innerHTML = '<div class="empty">Error</div>'; return; }
  const issued = histRes.history.filter(h => h.points > 0).reduce((s, h) => s + h.points, 0);
  const redeemed = Math.abs(histRes.history.filter(h => h.points < 0).reduce((s, h) => s + h.points, 0));
  $('ptsIssued').textContent = fmt(issued);
  $('ptsRedeemed').textContent = fmt(redeemed);
  $('ptsTotal').textContent = fmt(issued - redeemed);
  if (!histRes.history.length) { box.innerHTML = '<div class="empty">⭐ Points မရှိသေးပါ။</div>'; return; }
  box.innerHTML = '';
  histRes.history.forEach(h => {
    const c = document.createElement('div'); c.className = 'card'; c.style.padding = '10px 14px';
    const color = h.points > 0 ? '#27ae60' : '#e74c3c';
    c.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:13px"><div>👤 <b>' + h.user_name + '</b><br><span style="color:#8a90a0">' + h.reason + (h.ref ? ' • ' + h.ref : '') + '</span><br><span style="color:#8a90a0;font-size:11px">' + fmtTime(h.created_at) + '</span></div><div style="text-align:right"><span style="color:' + color + ';font-weight:bold">' + (h.points > 0 ? '+' : '') + h.points + ' pts</span><br><span style="color:#8a90a0;font-size:11px">Bal: ' + h.balance_after + '</span></div></div>';
    box.appendChild(c);
  });
}

// ===============================
// SPINS
// ===============================
async function loadSpins() {
  const box = $('spinsList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/spins', null, 'GET');
  if (!res.ok) { box.innerHTML = '<div class="empty">Error</div>'; return; }
  $('spinTotal').textContent = fmt(res.spins.length);
  $('spinReward').textContent = fmt(res.totalReward);
  if (!res.spins.length) { box.innerHTML = '<div class="empty">🎰 Spin မရှိသေးပါ။</div>'; return; }
  box.innerHTML = '';
  res.spins.forEach(s => {
    const c = document.createElement('div'); c.className = 'card'; c.style.padding = '10px 14px';
    c.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:13px"><div>👤 <b>' + s.user_name + '</b><br><span style="color:#8a90a0">' + fmtTime(s.created_at) + '</span></div><div style="text-align:right"><span style="color:#f39c12;font-weight:bold">🎁 ' + fmt(s.reward) + ' Ks</span></div></div>';
    box.appendChild(c);
  });
}

// ===============================
// CHATS
// ===============================
async function loadQRSelect() {
  const sel = $('qrSelect'); if (!sel) return;
  const res = await api('/api/admin/quick-replies', null, 'GET');
  if (res.ok && res.replies.length) {
    sel.innerHTML = '<option value="">-- ⚡ Quick Reply --</option>';
    res.replies.forEach(qr => { const o = document.createElement('option'); o.value = qr.text; o.textContent = '⚡ ' + qr.title; sel.appendChild(o); });
  }
}
$('qrSelect').addEventListener('change', (e) => { if (e.target.value) { $('chatReplyText').value = e.target.value; e.target.value = ''; } });
async function loadChats() {
  await loadQRSelect();
  const box = $('chatsList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/chats', null, 'GET');
  if (!res.ok || !res.messages.length) { box.innerHTML = '<div class="empty">💬 Chat မရှိပါ။</div>'; return; }
  box.innerHTML = '';
  const sel = $('chatUserSelect'); const cur = sel.value;
  sel.innerHTML = '<option value="">-- Select User --</option>';
  const uniqueUsers = [...new Map(res.messages.map(m => [m.user_id, m])).values()];
  uniqueUsers.forEach(m => { const o = document.createElement('option'); o.value = m.user_id; o.textContent = '#' + m.user_id + ' - ' + m.user_name; sel.appendChild(o); });
  sel.value = cur;
  res.messages.forEach(m => {
    const c = document.createElement('div'); c.className = 'card';
    c.innerHTML = '<div class="card-header"><div><div class="card-title">#' + m.id + ' ' + m.user_name + '</div><div class="card-meta">📱 ' + m.user_phone + '<br>⏰ ' + fmtTime(m.created_at) + '</div></div><div class="status-badge ' + (m.read_by_admin ? 'status-completed' : 'status-pending') + '">' + (m.read_by_admin ? 'READ' : 'NEW') + '</div></div><div style="background:#0a0c11;padding:12px;border-radius:10px;margin-top:10px">' + m.text.replace(/</g, '&lt;') + '</div>';
    box.appendChild(c);
  });
}
$('chatPhoto').addEventListener('change', (e) => { const f = e.target.files[0]; $('fileNameDisplay').textContent = f ? f.name : 'ဓာတ်ပုံ မရွေးရသေးပါ'; });
$('sendChatBtn').addEventListener('click', async () => {
  const userId = $('chatUserSelect').value; const text = $('chatReplyText').value.trim(); const photoInput = $('chatPhoto');
  if (!userId) return toast('User ရွေးပါ', 'error');
  if (!text && !photoInput.files[0]) return toast('စာသား သို့မဟုတ် ဓာတ်ပုံ ထည့်ပါ', 'error');
  const fd = new FormData(); fd.append('user_id', userId); fd.append('text', text);
  if (photoInput.files[0]) fd.append('photo', photoInput.files[0]);
  try {
    const res = await fetch('/api/admin/chat/reply', { method: 'POST', headers: { 'X-Admin-Password': ADMIN.pwd, 'X-Admin-Username': ADMIN.username }, body: fd }).then(r => r.json());
    if (res.ok) { toast('✅ Reply ပို့ပြီ', 'success'); $('chatReplyText').value = ''; photoInput.value = ''; $('fileNameDisplay').textContent = 'ဓာတ်ပုံ မရွေးရသေးပါ'; loadChats(); } else toast(res.error || 'Error', 'error');
  } catch (e) { toast('Server Error', 'error'); }
});

// ===============================
// BROADCAST
// ===============================
$('sendBcastBtn').addEventListener('click', async () => {
  const message = $('bcastMessage').value.trim(); const image_url = $('bcastImage').value.trim();
  if (!message && !image_url) return toast('စာသား သို့မဟုတ် URL ထည့်ပါ', 'error');
  if (!confirm('Send to ALL users?')) return;
  $('bcastStatus').textContent = '⏳ Sending...'; $('sendBcastBtn').disabled = true;
  const res = await api('/api/admin/broadcast', { message, image_url });
  if (res.ok) { toast('✅ Started', 'success'); $('bcastStatus').textContent = '✅ Total: ' + res.total + ' users'; $('bcastMessage').value = ''; $('bcastImage').value = ''; }
  else { toast(res.error || 'Error', 'error'); $('bcastStatus').textContent = '❌ Failed'; }
  $('sendBcastBtn').disabled = false;
});

// ===============================
// SETTINGS
// ===============================
async function loadSettings() {
  const res = await api('/api/admin/settings', null, 'GET');
  if (!res.ok) return;
  const s = res.settings;
  const box = $('settingsContent');
  box.innerHTML =
    '<div class="setting-group"><h3>💎 Loyalty Points</h3>' +
    '<div class="setting-row"><label>Enable Loyalty Points</label><div class="toggle ' + (s.loyalty_enabled === '1' ? 'on' : '') + '" data-key="loyalty_enabled" onclick="toggleSetting(this)"></div></div>' +
    '<div class="setting-row"><label>Points per 1000 Ks</label><input type="number" data-key="points_per_1000ks" value="' + (s.points_per_1000ks || '10') + '" /></div>' +
    '<div class="setting-row"><label>1 Point = ? Ks</label><input type="number" data-key="points_to_ks_rate" value="' + (s.points_to_ks_rate || '10') + '" /></div>' +
    '<div class="setting-row"><label>Min Redeem Points</label><input type="number" data-key="points_min_redeem" value="' + (s.points_min_redeem || '100') + '" /></div></div>' +
    '<div class="setting-group"><h3>🎁 Referral System</h3>' +
    '<div class="setting-row"><label>Enable Referral</label><div class="toggle ' + (s.referral_enabled === '1' ? 'on' : '') + '" data-key="referral_enabled" onclick="toggleSetting(this)"></div></div>' +
    '<div class="setting-row"><label>ဖိတ်ခေါ်သူ Bonus (Ks)</label><input type="number" data-key="referral_inviter_bonus" value="' + (s.referral_inviter_bonus || '500') + '" /></div>' +
    '<div class="setting-row"><label>ဖိတ်ခံရသူ Bonus (Ks)</label><input type="number" data-key="referral_invitee_bonus" value="' + (s.referral_invitee_bonus || '500') + '" /></div></div>' +
    '<div class="setting-group"><h3>🎰 Lucky Spin</h3>' +
    '<div class="setting-row"><label>Enable Lucky Spin</label><div class="toggle ' + (s.spin_enabled === '1' ? 'on' : '') + '" data-key="spin_enabled" onclick="toggleSetting(this)"></div></div>' +
    '<div class="setting-row"><label>ဝယ်တိုင်း Spin ရမည့် အရေအတွက်</label><input type="number" data-key="spin_per_purchase" value="' + (s.spin_per_purchase || '1') + '" /></div>' +
    '<div class="setting-row" style="flex-direction:column;align-items:flex-start"><label>Rewards (JSON array)</label><input type="text" data-key="spin_rewards" value=\'' + (s.spin_rewards || '[100,200,300,500,1000,2000,5000]') + '\' style="width:100%" /></div></div>' +
    '<button class="save-settings-btn" onclick="saveSettings()">💾 Save Settings</button>';
}
window.toggleSetting = (el) => { el.classList.toggle('on'); };
window.saveSettings = async () => {
  const settings = {};
  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.dataset.key;
    if (el.classList.contains('toggle')) settings[key] = el.classList.contains('on') ? '1' : '0';
    else settings[key] = el.value;
  });
  const res = await api('/api/admin/settings', { settings });
  if (res.ok) { toast('✅ ' + res.count + ' settings saved', 'success'); } else toast('Error', 'error');
};

// ===============================
// ADMINS
// ===============================
async function loadAdmins() {
  const box = $('adminsList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/admins', null, 'GET');
  if (!res.ok) { box.innerHTML = '<div class="empty">Error</div>'; return; }
  box.innerHTML = '';
  const superCard = document.createElement('div');
  superCard.className = 'card';
  superCard.innerHTML =
    '<div class="card-header">' +
    '<div>' +
    '<div class="card-title">👑 admin <span class="badge-super">SUPER</span></div>' +
    '<div class="card-meta">ENV Password ဖြင့် ဝင်ရောက်<br>Role: <span class="badge-full">🔵 Full</span></div>' +
    '</div></div>';
  box.appendChild(superCard);
  res.admins.forEach(a => {
    const isMe = a.username === res.currentAdmin;
    const statusBadge = a.active ? '<span class="badge-active">🟢 Active</span>' : '<span class="badge-off">🔴 Off</span>';
    const roleBadge = a.role === 'full' ? '<span class="badge-full">🔵 Full</span>' : '<span class="badge-view">👁 View</span>';
    const meBadge = isMe ? '<span class="badge-you">YOU</span>' : '';
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML =
      '<div class="card-header">' +
      '<div>' +
      '<div class="card-title">👤 ' + a.name + ' <code>' + a.username + '</code>' + meBadge + '</div>' +
      '<div class="card-meta">' + statusBadge + ' ' + roleBadge + '<br>📅 ' + fmtDate(a.created_at) + '</div>' +
      '</div></div>' +
      '<div class="card-actions">' +
      '<button class="btn-edit" onclick="changeAdminPwd(' + a.id + ', \'' + a.username + '\')">🔑 Password</button>' +
      '<button class="btn-gray" onclick="toggleAdminActive(' + a.id + ')">' + (a.active ? '🔴 ပိတ်' : '🟢 ဖွင့်') + '</button>' +
      '<button class="btn-no" onclick="deleteAdmin(' + a.id + ', \'' + a.username + '\')">🗑️ Delete</button>' +
      '</div>';
    box.appendChild(card);
  });
}
$('addAdminBtn').addEventListener('click', () => {
  showModal(
    '<h2>➕ Admin အသစ်</h2>' +
    '<label>Username (English, 3+ လုံး)</label>' +
    '<input id="newAdminUser" placeholder="aung" style="text-transform:lowercase" />' +
    '<label>နာမည် (ပြသမည့် နာမည်)</label>' +
    '<input id="newAdminName" placeholder="Aung Aung" />' +
    '<label>Password (4+ လုံး)</label>' +
    '<input id="newAdminPwd" type="password" placeholder="password123" />' +
    '<label>Role</label>' +
    '<select id="newAdminRole">' +
    '<option value="full">🔵 Full — အကုန်လုံး လုပ်နိုင်</option>' +
    '<option value="view">👁 View — ကြည့်ရုံပဲ</option>' +
    '</select>' +
    '<button class="btn-submit" onclick="confirmAddAdmin()">💾 Save</button>'
  );
});
window.confirmAddAdmin = async () => {
  const username = ($('newAdminUser').value || '').toLowerCase().trim();
  const name = $('newAdminName').value.trim();
  const password = $('newAdminPwd').value;
  const role = $('newAdminRole').value;
  if (!username || username.length < 3) return toast('Username 3 လုံးအထက် ထည့်ပါ', 'error');
  if (!/^[a-z0-9_]+$/.test(username)) return toast('Username တွင် a-z, 0-9, _ သာ သုံးပါ', 'error');
  if (!password || password.length < 4) return toast('Password 4 လုံးအထက် ထည့်ပါ', 'error');
  const res = await api('/api/admin/admins/add', { username: username, name: name || username, password: password, role: role });
  if (res.ok) { toast('✅ Admin အသစ် ဖန်တီးပြီ', 'success'); closeModal(); loadAdmins(); }
  else toast(res.error || 'Error', 'error');
};
window.toggleAdminActive = async (id) => {
  if (!confirm('Admin ကို ပိတ်/ဖွင့် လုပ်မလား?')) return;
  const res = await api('/api/admin/admins/toggle', { admin_id: id });
  if (res.ok) { toast(res.active ? '🟢 Active' : '🔴 Disabled', 'success'); loadAdmins(); }
  else toast(res.error || 'Error', 'error');
};
window.deleteAdmin = async (id, username) => {
  if (!confirm('Admin "' + username + '" ကို ဖျက်မလား?')) return;
  const res = await api('/api/admin/admins/delete', { admin_id: id });
  if (res.ok) { toast('🗑️ ဖျက်ပြီ', 'success'); loadAdmins(); }
  else toast(res.error || 'Error', 'error');
};
window.changeAdminPwd = (id, username) => {
  showModal(
    '<h2>🔑 Password ပြောင်း — ' + username + '</h2>' +
    '<label>Password အသစ် (4+ လုံး)</label>' +
    '<input id="chgPwdNew" type="password" />' +
    '<button class="btn-submit" onclick="confirmChangePwd(' + id + ')">💾 Save</button>'
  );
};
window.confirmChangePwd = async (id) => {
  const newPwd = $('chgPwdNew').value;
  if (!newPwd || newPwd.length < 4) return toast('Password 4 လုံးအထက် ထည့်ပါ', 'error');
  const res = await api('/api/admin/admins/change-password', { admin_id: id, new_password: newPwd });
  if (res.ok) { toast('✅ Password ပြောင်းပြီ', 'success'); closeModal(); }
  else toast(res.error || 'Error', 'error');
};

// ===============================
// LOGS
// ===============================
async function loadLogs() {
  const box = $('logsList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  try {
    const res = await fetch('/api/admin/logs/detailed?limit=200', {
      headers: { 'X-Admin-Password': ADMIN.pwd, 'X-Admin-Username': ADMIN.username }
    }).then(r => r.json());
    if (!res.ok) { box.innerHTML = '<div class="empty">Error: ' + (res.error || 'Unknown') + '</div>'; return; }
    let html = '<div class="card" style="margin-bottom:12px"><div style="font-size:13px;color:#8a90a0;margin-bottom:8px">📊 Total: <b style="color:#2ea6ff">' + (res.total || 0) + '</b> logs</div><div>';
    Object.entries(res.actions || {}).slice(0, 15).forEach(function(entry) {
      html += '<span class="log-action">' + entry[0] + ' <b>' + entry[1] + '</b></span>';
    });
    html += '</div></div>';
    box.innerHTML = html;
    if (!res.logs || !res.logs.length) { box.innerHTML += '<div class="empty">📜 Log မရှိပါ။</div>'; return; }
    res.logs.forEach(function(l) {
      const card = document.createElement('div');
      card.className = 'card'; card.style.padding = '10px 14px';
      const icon = (function(a) {
        if (!a) return '📋';
        if (a.indexOf('order') >= 0) return '🛒';
        if (a.indexOf('deposit') >= 0) return '📥';
        if (a.indexOf('ban') >= 0) return '🚫';
        if (a.indexOf('balance') >= 0) return '💰';
        if (a.indexOf('point') >= 0) return '⭐';
        if (a.indexOf('broadcast') >= 0) return '📢';
        if (a.indexOf('promo') >= 0) return '🎟️';
        if (a.indexOf('stock') >= 0) return '📦';
        if (a.indexOf('banner') >= 0) return '🖼️';
        if (a.indexOf('image') >= 0) return '📷';
        if (a.indexOf('settings') >= 0) return '⚙️';
        if (a.indexOf('admin_') >= 0) return '👤';
        return '📋';
      })(l.action);
      const isAdminAction = l.actor && l.actor !== 'admin-panel';
      const adminName = isAdminAction ? '<span style="background:#6a5cff;color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;margin-left:6px">👤 ' + l.actor + '</span>' : '';
      card.innerHTML = '<div style="display:flex;justify-content:space-between;gap:10px">' +
        '<div style="flex:1;font-size:12px">' +
        '<div><b style="color:#2ea6ff">' + icon + ' ' + (l.action || '-') + '</b>' + (l.target ? ' • <span style="color:#f39c12">' + l.target + '</span>' : '') + adminName + '</div>' +
        (l.details ? '<div style="color:#8a90a0;margin-top:4px">' + l.details + '</div>' : '') +
        '</div>' +
        '<div style="font-size:11px;color:#8a90a0;text-align:right;white-space:nowrap">' + l.timeFormatted + '<br>' + l.relative + '</div>' +
        '</div>';
      box.appendChild(card);
    });
  } catch(e) {
    box.innerHTML = '<div class="empty">Error: ' + e.message + '</div>';
  }
}

// ===============================
// AUTO REFRESH
// ===============================
setInterval(() => { if (!ADMIN.pwd) return; if (ADMIN.currentTab === 'dash') loadDash(); }, 15000);
