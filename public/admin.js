const $ = (id) => document.getElementById(id);
let ADMIN = { pwd: '', currentTab: 'dash', filterDep: 'pending', filterOrd: 'pending' };
let revenueChartInstance = null;
let usersChartInstance = null;
let lastPendingDep = 0;
let lastPendingOrd = 0;

function toast(msg, type = '') { const t = $('toast'); t.textContent = msg; t.className = 'toast ' + type; t.classList.remove('hidden'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.add('hidden'), 3000); }
function showModal(html) { $('modalBody').innerHTML = html; $('modal').classList.remove('hidden'); }
function closeModal() { $('modal').classList.add('hidden'); }
window.closeModal = closeModal;

async function api(path, body = null, method = 'POST') {
  const headers = { 'Content-Type': 'application/json', 'X-Admin-Password': ADMIN.pwd };
  const opts = { method, headers };
  if (body && method === 'POST') opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (res.status === 401) { logout(); throw new Error('unauthorized'); }
  return res.json();
}
function fmt(n) { return Number(n || 0).toLocaleString(); }
function fmtTime(ts) { return new Date(ts * 1000).toLocaleString(); }

function playNotification() { const audio = document.getElementById('notifySound'); if (audio) audio.play().catch(e => console.log('Sound play blocked:', e)); }
function requestNotificationPermission() { if ('Notification' in window) Notification.requestPermission(); }
function sendPushNotification(title, body) { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body: body }); }
function checkNewAlerts(stats) {
  if (stats.pendingDeposits > lastPendingDep || stats.pendingOrders > lastPendingOrd) {
    if (lastPendingDep !== 0 || lastPendingOrd !== 0) { playNotification(); sendPushNotification('🔔 Admin Alert', 'You have new pending orders or deposits!'); }
    lastPendingDep = stats.pendingDeposits; lastPendingOrd = stats.pendingOrders;
  }
}

async function doLogin() {
  const pwd = $('pwd').value; if (!pwd) return;
  try {
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) }).then(r => r.json());
    if (res.ok) { ADMIN.pwd = pwd; localStorage.setItem('admin_pwd', pwd); enterAdmin(); requestNotificationPermission(); }
    else { $('loginError').textContent = res.error || 'မအောင်မြင်ပါ'; $('loginError').classList.remove('hidden'); }
  } catch(e) { $('loginError').textContent = 'Server error'; $('loginError').classList.remove('hidden'); }
}
$('loginBtn').addEventListener('click', doLogin);
$('pwd').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

function logout() { localStorage.removeItem('admin_pwd'); ADMIN.pwd = ''; $('adminScreen').classList.add('hidden'); $('loginScreen').classList.remove('hidden'); $('pwd').value = ''; }
$('logoutBtn').addEventListener('click', logout);
function enterAdmin() { $('loginScreen').classList.add('hidden'); $('adminScreen').classList.remove('hidden'); loadTab('dash'); }
(function() {
  const saved = localStorage.getItem('admin_pwd');
  if (saved) { ADMIN.pwd = saved; fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: saved }) }).then(r => r.json()).then(res => { if (res.ok) { enterAdmin(); requestNotificationPermission(); } else logout(); }).catch(() => logout()); }
})();

document.querySelectorAll('.tab').forEach(t => { t.addEventListener('click', () => loadTab(t.dataset.tab)); });
function loadTab(name) {
  ADMIN.currentTab = name;
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(x => x.classList.toggle('active', x.id === 'tab-' + name));
  if (name === 'dash') loadDash();
  else if (name === 'analytics') loadAnalytics();
  else if (name === 'deposits') loadDeposits();
  else if (name === 'orders') loadOrders();
  else if (name === 'users') loadUsers();
  else if (name === 'items') loadItems();
  else if (name === 'banners') loadBanners();
  else if (name === 'chats') loadChats();
  else if (name === 'quickreplies') loadQR();
  else if (name === 'broadcast') { $('bcastStatus').textContent = ''; }
  else if (name === 'logs') loadLogs();
}

async function loadDash() {
  const res = await api('/api/admin/stats', null, 'GET'); if (!res.ok) return;
  $('sUsers').textContent = fmt(res.stats.users); $('sBalance').textContent = fmt(res.totalBalance);
  $('sPendingDep').textContent = fmt(res.stats.pendingDeposits); $('sPendingOrd').textContent = fmt(res.stats.pendingOrders);
  $('sTotalDep').textContent = fmt(res.stats.totalDeposit); $('sSales').textContent = fmt(res.stats.totalSales);
  $('sItems').textContent = fmt(res.itemsCount); $('sChats').textContent = fmt(res.unreadChats);
  const btn = $('toggleAppBtn'); btn.textContent = res.enabled ? '🟢 App ON' : '🔴 App OFF'; btn.className = 'btn-toggle' + (res.enabled ? '' : ' off');
  checkNewAlerts(res.stats); loadCharts();
}
async function loadCharts() {
  const revRes = await api('/api/admin/revenue?days=7', null, 'GET');
  if (revRes.ok) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(ctx, { type: 'line', data: { labels: revRes.data.map(d => d.date), datasets: [{ label: 'Sales (MMK)', data: revRes.data.map(d => d.sales), borderColor: '#2ea6ff', backgroundColor: 'rgba(46, 166, 255, 0.1)', tension: 0.3, fill: true }, { label: 'Deposits (MMK)', data: revRes.data.map(d => d.deposits), borderColor: '#27ae60', backgroundColor: 'rgba(39, 174, 96, 0.1)', tension: 0.3, fill: true }] }, options: { responsive: true, plugins: { legend: { labels: { color: '#e5e7eb' } } }, scales: { x: { ticks: { color: '#8a90a0' } }, y: { ticks: { color: '#8a90a0' } } } } });
  }
  const anRes = await api('/api/admin/analytics', null, 'GET');
  if (anRes.ok) {
    const ctx = document.getElementById('usersChart').getContext('2d');
    if (usersChartInstance) usersChartInstance.destroy();
    usersChartInstance = new Chart(ctx, { type: 'bar', data: { labels: anRes.dailyReg.map(d => d.date), datasets: [{ label: 'New Users', data: anRes.dailyReg.map(d => d.count), backgroundColor: '#2ea6ff', borderRadius: 6 }] }, options: { responsive: true, plugins: { legend: { labels: { color: '#e5e7eb' } } }, scales: { x: { ticks: { color: '#8a90a0' } }, y: { ticks: { color: '#8a90a0' } } } } });
  }
}
$('toggleAppBtn').addEventListener('click', async () => { const res = await api('/api/admin/toggle-miniapp', {}); if (res.ok) { toast(res.enabled ? 'App ဖွင့်ပြီ' : 'App ပိတ်ပြီ', 'success'); loadDash(); } });
$('backupBtn').addEventListener('click', async () => { toast('💾 ပို့နေသည်...'); const res = await api('/api/admin/backup', {}, 'POST'); if (res.ok) toast('✅ Bot Chat ဆီ Backup ပို့ပြီ', 'success'); });

async function loadAnalytics() {
  const res = await api('/api/admin/analytics', null, 'GET'); if (!res.ok) return;
  $('aTotalUsers').textContent = fmt(res.totalUsers); $('aActiveUsers').textContent = fmt(res.activeUsers);
  $('aTotalOrders').textContent = fmt(res.totalOrders); $('aCompletedOrders').textContent = fmt(res.completedOrders);
  const spenderBox = $('topSpendersList'); spenderBox.innerHTML = '';
  res.topUsers.forEach(u => { const card = document.createElement('div'); card.className = 'card'; card.style.padding = '10px 14px'; card.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:13px;"><div><b>#${u.id} ${u.name}</b><br><span style="color:#8a90a0">${u.phone}</span></div><div style="text-align:right;"><span style="color:#27ae60;font-weight:bold;">${fmt(u.totalSpent)} Ks</span><br><span style="color:#8a90a0;font-size:11px;">${u.orderCount} orders</span></div></div>`; spenderBox.appendChild(card); });
  const itemBox = $('topItemsList'); itemBox.innerHTML = '';
  res.topItems.forEach(i => { const card = document.createElement('div'); card.className = 'card'; card.style.padding = '10px 14px'; card.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:13px;"><div><b>${i.name}</b><br><span style="color:#8a90a0">${i.game_id.toUpperCase()}</span></div><div style="text-align:right;"><span style="color:#2ea6ff;font-weight:bold;">${fmt(i.revenue)} Ks</span><br><span style="color:#8a90a0;font-size:11px;">${i.count} sold</span></div></div>`; itemBox.appendChild(card); });
}

document.querySelectorAll('#tab-deposits .filter').forEach(f => { f.addEventListener('click', () => { document.querySelectorAll('#tab-deposits .filter').forEach(x => x.classList.remove('active')); f.classList.add('active'); ADMIN.filterDep = f.dataset.status; loadDeposits(); }); });
async function loadDeposits() {
  const box = $('depositsList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/deposits?status=' + ADMIN.filterDep, null, 'GET');
  if (!res.ok || !res.deposits.length) { box.innerHTML = '<div class="empty">📥 Deposit မရှိပါ။</div>'; return; }
  box.innerHTML = '';
  res.deposits.forEach(d => {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<div class="card-header"><div><div class="card-title">#${d.id} • ${d.user_name}</div><div class="card-meta">📱 ${d.user_phone}<br>🏦 ${d.method}<br>⏰ ${fmtTime(d.created_at)}</div></div><div style="text-align:right"><div class="card-price">${fmt(d.amount)} Ks</div><div class="status-badge status-${d.status}">${d.status}</div></div></div>${d.status === 'pending' ? `<div class="card-actions"><button class="btn-ok" onclick="approveDep(${d.id})">✅ Approve</button><button class="btn-no" onclick="rejectDep(${d.id})">❌ Reject</button></div>` : ''}`;
    box.appendChild(card);
  });
}
window.approveDep = async (id) => { if (!confirm('Approve #' + id + '?')) return; const res = await api('/api/admin/deposit/approve', { deposit_id: id }); if (res.ok) { toast('✅ Approved', 'success'); loadDeposits(); } else toast(res.error || 'Error', 'error'); };
window.rejectDep = async (id) => { if (!confirm('Reject #' + id + '?')) return; const res = await api('/api/admin/deposit/reject', { deposit_id: id }); if (res.ok) { toast('❌ Rejected', 'success'); loadDeposits(); } else toast(res.error || 'Error', 'error'); };

document.querySelectorAll('#tab-orders .filter').forEach(f => { f.addEventListener('click', () => { document.querySelectorAll('#tab-orders .filter').forEach(x => x.classList.remove('active')); f.classList.add('active'); ADMIN.filterOrd = f.dataset.status; loadOrders(); }); });
async function loadOrders() {
  const box = $('ordersList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/orders?status=' + ADMIN.filterOrd, null, 'GET');
  if (!res.ok || !res.orders.length) { box.innerHTML = '<div class="empty">🛒 Order မရှိပါ။</div>'; return; }
  box.innerHTML = '';
  res.orders.forEach(o => {
    let info = o.needs_account ? '⚠️ App Premium' : ('🆔 ' + (o.game_account || '-') + (o.server_id ? ' • 🌐 ' + o.server_id : ''));
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<div class="card-header"><div><div class="card-title">#${o.id} • ${o.item_name}</div><div class="card-meta">👤 ${o.user_name}<br>📱 ${o.user_phone}<br>🎮 ${o.game_id}<br>${info}<br>⏰ ${fmtTime(o.created_at)}</div></div><div style="text-align:right"><div class="card-price">${fmt(o.price)} Ks</div><div class="status-badge status-${o.status}">${o.status}</div></div></div>${o.status === 'pending' ? `<div class="card-actions"><button class="btn-ok" onclick="completeOrder(${o.id})">✅ Complete</button><button class="btn-no" onclick="refundOrder(${o.id})">❌ Refund</button></div>` : ''}`;
    box.appendChild(card);
  });
}
window.completeOrder = (id) => { showModal(`<h2>✅ Complete Order #${id}</h2><label>Account Info (User ဆီ ပို့မယ့် message)</label><textarea id="accInfo" rows="5" placeholder="📧 user@example.com&#10;🔑 password123"></textarea><button class="btn-submit" onclick="confirmComplete(${id})">📤 Complete & Send</button>`); };
window.confirmComplete = async (id) => { const info = $('accInfo').value; const res = await api('/api/admin/order/complete', { order_id: id, account_info: info }); if (res.ok) { toast('✅ Complete', 'success'); closeModal(); loadOrders(); } else toast(res.error || 'Error', 'error'); };
window.refundOrder = async (id) => { if (!confirm('Refund #' + id + '?')) return; const res = await api('/api/admin/order/refund', { order_id: id }); if (res.ok) { toast('❌ Refunded', 'success'); loadOrders(); } else toast(res.error || 'Error', 'error'); };

$('userSearch').addEventListener('input', () => loadUsers());
async function loadUsers() {
  const q = $('userSearch').value.trim(); const box = $('usersList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/users?q=' + encodeURIComponent(q), null, 'GET');
  if (!res.ok || !res.users.length) { box.innerHTML = '<div class="empty">👥 User မရှိပါ။</div>'; return; }
  box.innerHTML = '';
  res.users.forEach(u => {
    const card = document.createElement('div'); card.className = 'card'; const safeName = (u.name || u.first_name || '').replace(/'/g, '');
    card.innerHTML = `<div class="card-header"><div><div class="card-title">#${u.id} ${u.name || u.first_name || '-'} ${u.banned ? '<span class="status-badge status-banned">BANNED</span>' : ''}</div><div class="card-meta">📱 ${u.phone || '-'}<br>🆔 TG: ${u.telegram_id}<br>📅 ${new Date((u.created_at||0)*1000).toLocaleDateString()}</div></div><div class="card-price">${fmt(u.balance)} Ks</div></div><div class="card-actions"><button class="btn-edit" onclick="adjustBal(${u.id}, '${safeName}')">💰 Balance</button><button class="${u.banned ? 'btn-ok' : 'btn-no'}" onclick="toggleBan(${u.id})">${u.banned ? '✅ Unban' : '🚫 Ban'}</button></div>`;
    box.appendChild(card);
  });
}
window.adjustBal = (id, name) => { showModal(`<h2>💰 Balance — ${name}</h2><label>ပမာဏ (+ / -)</label><input id="balAmt" type="number" placeholder="10000 or -5000" /><label>မှတ်ချက်</label><input id="balNote" placeholder="Bonus / Correction" /><button class="btn-submit" onclick="confirmBal(${id})">💾 Save</button>`); };
window.confirmBal = async (id) => { const amount = Number($('balAmt').value); const note = $('balNote').value; if (!amount) return toast('ပမာဏ ထည့်ပါ', 'error'); const res = await api('/api/admin/user/balance', { user_id: id, amount, note }); if (res.ok) { toast(`✅ New: ${fmt(res.newBalance)} Ks`, 'success'); closeModal(); loadUsers(); } else toast(res.error || 'Error', 'error'); };
window.toggleBan = async (id) => { if (!confirm('Toggle ban?')) return; const res = await api('/api/admin/user/ban', { user_id: id }); if (res.ok) { toast(res.banned ? '🚫 Banned' : '✅ Unbanned', 'success'); loadUsers(); } else toast(res.error || 'Error', 'error'); };

async function loadItems() {
  const box = $('itemsList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/items', null, 'GET'); if (!res.ok) return;
  const byGame = {}; res.items.forEach(i => { if (!byGame[i.game_id]) byGame[i.game_id] = []; byGame[i.game_id].push(i); }); box.innerHTML = '';
  Object.entries(byGame).forEach(([g, list]) => {
    const h = document.createElement('h3'); h.style.cssText = 'margin:16px 0 8px;color:#2ea6ff'; h.textContent = `${g.toUpperCase()} (${list.length})`; box.appendChild(h);
    list.forEach(i => {
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `<div class="card-header"><div><div class="card-title">#${i.id} ${i.category ? '[' + i.category + '] ' : ''}${i.name}</div><div class="card-meta">${i.active ? '🟢 Active' : '🔴 Hidden'}</div></div><div class="card-price">${fmt(i.price)} Ks</div></div><div class="card-actions"><button class="btn-edit" onclick="editPrice(${i.id}, ${i.price})">💵 Price</button><button class="btn-gray" onclick="toggleItem(${i.id})">${i.active ? '🔴 Hide' : '🟢 Show'}</button><button class="btn-no" onclick="delItem(${i.id})">🗑️ Delete</button></div>`;
      box.appendChild(card);
    });
  });
}
window.editPrice = (id, price) => { const np = prompt('New price:', price); if (!np) return; api('/api/admin/item/price', { item_id: id, price: Number(np) }).then(r => { if (r.ok) { toast('✅ Updated', 'success'); loadItems(); } }); };
window.toggleItem = (id) => api('/api/admin/item/toggle', { item_id: id }).then(r => { if (r.ok) loadItems(); });
window.delItem = (id) => { if (!confirm('Delete #' + id + '?')) return; api('/api/admin/item/delete', { item_id: id }).then(r => { if (r.ok) { toast('🗑️ Deleted', 'success'); loadItems(); } }); };
$('addItemBtn').addEventListener('click', async () => {
  const res = await api('/api/admin/items', null, 'GET'); if (!res.ok) return;
  const gameOpts = res.games.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
  showModal(`<h2>➕ Item အသစ်</h2><label>ဂိမ်း</label><select id="newGame">${gameOpts}</select><label>နာမည်</label><input id="newName" /><label>စျေး (Ks)</label><input id="newPrice" type="number" /><label>Category</label><input id="newCat" placeholder="📱 Telegram" /><button class="btn-submit" onclick="confirmAddItem()">💾 Save</button>`);
});
window.confirmAddItem = async () => {
  const game_id = $('newGame').value; const name = $('newName').value.trim(); const price = Number($('newPrice').value); const category = $('newCat').value.trim() || null;
  if (!name || !price) return toast('အားလုံး ဖြည့်ပါ', 'error');
  const res = await api('/api/admin/item/add', { game_id, name, price, category });
  if (res.ok) { toast('✅ #' + res.id, 'success'); closeModal(); loadItems(); } else toast(res.error || 'Error', 'error');
};

async function loadBanners() {
  const box = $('bannersList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/banners', null, 'GET');
  if (!res.ok || !res.banners.length) { box.innerHTML = '<div class="empty">🖼️ Banner မရှိပါ။</div>'; return; }
  box.innerHTML = '';
  res.banners.forEach(b => {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<div class="card-header"><div><div class="card-title">${b.title}</div><div class="card-meta">${b.subtitle || ''}<br>Colors: ${b.color1} → ${b.color2}<br>Status: ${b.active ? '🟢 Active' : '🔴 Hidden'}</div></div><div style="width:80px;height:50px;border-radius:8px;background:linear-gradient(135deg,${b.color1},${b.color2});"></div></div><div class="card-actions"><button class="btn-gray" onclick="toggleBanner(${b.id})">${b.active ? '🔴 Hide' : '🟢 Show'}</button><button class="btn-no" onclick="delBanner(${b.id})">🗑️ Delete</button></div>`;
    box.appendChild(card);
  });
}
$('addBannerBtn').addEventListener('click', () => {
  showModal(`<h2>🖼️ Banner အသစ်</h2><label>Title</label><input id="bnTitle" placeholder="🎉 Welcome to Safe Zone" /><label>Subtitle</label><input id="bnSubtitle" placeholder="Fast & Safe Game Topup" /><label>Color 1</label><input id="bnColor1" type="color" value="#2ea6ff" /><label>Color 2</label><input id="bnColor2" type="color" value="#6a5cff" /><button class="btn-submit" onclick="confirmAddBanner()">💾 Save</button>`);
});
window.confirmAddBanner = async () => {
  const title = $('bnTitle').value.trim(); const subtitle = $('bnSubtitle').value.trim(); const color1 = $('bnColor1').value; const color2 = $('bnColor2').value;
  if (!title) return toast('Title ထည့်ပါ', 'error');
  const res = await api('/api/admin/banner/add', { title, subtitle, color1, color2 });
  if (res.ok) { toast('✅ Created', 'success'); closeModal(); loadBanners(); } else toast(res.error || 'Error', 'error');
};
window.toggleBanner = async (id) => { const res = await api('/api/admin/banner/toggle', { banner_id: id }); if (res.ok) loadBanners(); };
window.delBanner = async (id) => { if (!confirm('Delete?')) return; const res = await api('/api/admin/banner/delete', { banner_id: id }); if (res.ok) { toast('🗑️ Deleted', 'success'); loadBanners(); } };

async function loadQRSelect() {
  const select = $('qrSelect'); if (!select) return;
  const res = await api('/api/admin/quick-replies', null, 'GET');
  if (res.ok && res.replies.length) {
    select.innerHTML = '<option value="">-- ⚡ Quick Reply ရွေးရန် --</option>';
    res.replies.forEach(qr => { const opt = document.createElement('option'); opt.value = qr.text; opt.textContent = `⚡ ${qr.title}`; select.appendChild(opt); });
  }
}
document.getElementById('qrSelect').addEventListener('change', (e) => { if (e.target.value) { $('chatReplyText').value = e.target.value; e.target.value = ''; } });

async function loadChats() {
  await loadQRSelect();
  const box = $('chatsList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/chats', null, 'GET');
  if (!res.ok || !res.messages.length) { box.innerHTML = '<div class="empty">💬 Chat မရှိပါ။</div>'; return; }
  box.innerHTML = '';
  const select = $('chatUserSelect'); const currentVal = select.value;
  select.innerHTML = '<option value="">-- Select User --</option>';
  const uniqueUsers = [...new Map(res.messages.map(m => [m.user_id, m])).values()];
  uniqueUsers.forEach(m => { const opt = document.createElement('option'); opt.value = m.user_id; opt.textContent = `#${m.user_id} - ${m.user_name} (${m.user_phone})`; select.appendChild(opt); });
  select.value = currentVal;
  res.messages.forEach(m => {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<div class="card-header"><div><div class="card-title">#${m.id} ${m.user_name}</div><div class="card-meta">📱 ${m.user_phone}<br>⏰ ${fmtTime(m.created_at)}</div></div><div class="status-badge ${m.read_by_admin ? 'status-completed' : 'status-pending'}">${m.read_by_admin ? 'READ' : 'NEW'}</div></div><div style="background:#0a0c11;padding:12px;border-radius:10px;margin-top:10px">${m.text.replace(/</g,'&lt;')}</div>`;
    box.appendChild(card);
  });
}
$('chatPhoto').addEventListener('change', (e) => { const file = e.target.files[0]; $('fileNameDisplay').textContent = file ? file.name : 'ဓာတ်ပုံ မရွေးရသေးပါ'; });
$('sendChatBtn').addEventListener('click', async () => {
  const userId = $('chatUserSelect').value; const text = $('chatReplyText').value.trim(); const photoInput = $('chatPhoto');
  if (!userId) return toast('User ရွေးပါ', 'error');
  if (!text && !photoInput.files[0]) return toast('စာသား သို့မဟုတ် ဓာတ်ပုံ ထည့်ပါ', 'error');
  const formData = new FormData(); formData.append('user_id', userId); formData.append('text', text);
  if (photoInput.files[0]) formData.append('photo', photoInput.files[0]);
  try {
    const res = await fetch('/api/admin/chat/reply', { method: 'POST', headers: { 'X-Admin-Password': ADMIN.pwd }, body: formData }).then(r => r.json());
    if (res.ok) { toast('✅ Reply ပို့ပြီ', 'success'); $('chatReplyText').value = ''; photoInput.value = ''; $('fileNameDisplay').textContent = 'ဓာတ်ပုံ မရွေးရသေးပါ'; loadChats(); } else toast(res.error || 'Error', 'error');
  } catch (e) { toast('Server Error', 'error'); }
});

async function loadQR() {
  const box = $('qrList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/quick-replies', null, 'GET');
  if (!res.ok || !res.replies.length) { box.innerHTML = '<div class="empty">⚡ Quick Reply မရှိပါ။</div>'; return; }
  box.innerHTML = '';
  res.replies.forEach((qr, idx) => {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<div class="card-header"><div><div class="card-title">${qr.title || 'Quick Reply ' + (idx+1)}</div><div class="card-meta" style="white-space: pre-wrap; margin-top: 8px;">${qr.text}</div></div><button class="btn-no" onclick="delQR(${idx})">🗑️</button></div>`;
    box.appendChild(card);
  });
}
$('addQRBtn').addEventListener('click', () => { showModal(`<h2>⚡ Quick Reply အသစ်</h2><label>ခေါင်းစဉ်</label><input id="qrTitle" placeholder="ငွေဖြည့်နည်း" /><label>စာသား</label><textarea id="qrText" rows="4" placeholder="KBZ 09763442881 သို့ ငွေလွှဲပါ..."></textarea><button class="btn-submit" onclick="confirmAddQR()">💾 Save</button>`); });
window.confirmAddQR = async () => {
  const title = $('qrTitle').value.trim(); const text = $('qrText').value.trim();
  if (!title || !text) return toast('အားလုံး ဖြည့်ပါ', 'error');
  const res = await api('/api/admin/quick-replies', null, 'GET');
  const replies = res.ok ? res.replies : []; replies.push({ title, text });
  const saveRes = await api('/api/admin/quick-replies', { replies }, 'POST');
  if (saveRes.ok) { toast('✅ Saved', 'success'); closeModal(); loadQR(); } else toast('Error', 'error');
};
window.delQR = async (idx) => { if (!confirm('Delete?')) return; const res = await api('/api/admin/quick-replies', null, 'GET'); const replies = res.ok ? res.replies : []; replies.splice(idx, 1); await api('/api/admin/quick-replies', { replies }, 'POST'); loadQR(); };

$('sendBcastBtn').addEventListener('click', async () => {
  const message = $('bcastMessage').value.trim(); const image_url = $('bcastImage').value.trim();
  if (!message && !image_url) return toast('စာသား သို့မဟုတ် ပုံ URL ထည့်ပါ', 'error');
  if (!confirm('Send to ALL users?')) return;
  $('bcastStatus').textContent = '⏳ Sending...'; $('sendBcastBtn').disabled = true;
  const res = await api('/api/admin/broadcast', { message, image_url });
  if (res.ok) { toast('✅ Broadcast စတင်လိုက်ပါပြီ', 'success'); $('bcastStatus').textContent = `✅ Total users: ${res.total}. Sending in background...`; $('bcastMessage').value = ''; $('bcastImage').value = ''; }
  else { toast(res.error || 'Error', 'error'); $('bcastStatus').textContent = '❌ Failed to start.'; }
  $('sendBcastBtn').disabled = false;
});

async function loadLogs() {
  const box = $('logsList'); box.innerHTML = '<div class="empty">ခဏစောင့်ပါ...</div>';
  const res = await api('/api/admin/logs', null, 'GET');
  if (!res.ok || !res.logs.length) { box.innerHTML = '<div class="empty">📜 Log မရှိပါ။</div>'; return; }
  box.innerHTML = '';
  res.logs.forEach(l => {
    const card = document.createElement('div'); card.className = 'card'; card.style.padding = '10px 14px';
    card.innerHTML = `<div style="display:flex;justify-content:space-between;gap:10px"><div style="font-size:12px"><b style="color:#2ea6ff">${l.action}</b>${l.target ? ' • ' + l.target : ''}${l.details ? '<br><span style="color:#8a90a0">' + l.details + '</span>' : ''}</div><div style="font-size:11px;color:#8a90a0;white-space:nowrap">${fmtTime(l.created_at)}</div></div>`;
    box.appendChild(card);
  });
}

setInterval(() => { if (!ADMIN.pwd) return; if (ADMIN.currentTab === 'dash') loadDash(); }, 15000);
