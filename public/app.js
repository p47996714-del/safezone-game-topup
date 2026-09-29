const tg = window.Telegram.WebApp;
tg.ready(); tg.expand();
try { tg.setHeaderColor('secondary_bg_color'); } catch(e){}

const $ = (id) => document.getElementById(id);
const initData = tg.initData || '';
let STATE = { user: null, games: [], items: [], selectedMethod: null, selectedItem: null, selectedGame: null, payments: {}, banners: [], wishlist: JSON.parse(localStorage.getItem('wishlist') || '[]') };
let CHAT = { open: false, timer: null, lastCount: 0 };
let AUDIO_CTX = null;

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Init-Data': initData, ...(opts.headers||{}) };
  const res = await fetch(path, { ...opts, headers });
  return res.json();
}
function toast(msg, type = '') {
  const t = $('toast'); t.textContent = msg; t.className = 'toast ' + type; t.classList.remove('hidden');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.add('hidden'), 3000);
  if (type === 'success') notifySound('success');
  else if (type === 'error') notifySound('error');
}
function show(id) { const el = $(id); if (el) el.classList.remove('hidden'); }
function hide(id) { const el = $(id); if (el) el.classList.add('hidden'); }

// ============ THEME ============
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('miniapp_theme', theme);
  const btn = $('themeToggle');
  if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
}
(function initTheme() { applyTheme(localStorage.getItem('miniapp_theme') || 'dark'); })();
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'themeToggle') {
    const cur = document.body.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
    try { tg.HapticFeedback.impactOccurred('light'); } catch(e){}
  }
});

// ============ SOUND ============
function playBeep(freq = 800, duration = 150) {
  try {
    if (!AUDIO_CTX) AUDIO_CTX = new (window.AudioContext || window.webkitAudioContext)();
    const osc = AUDIO_CTX.createOscillator();
    const gain = AUDIO_CTX.createGain();
    osc.connect(gain); gain.connect(AUDIO_CTX.destination);
    osc.frequency.value = freq; osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, AUDIO_CTX.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, AUDIO_CTX.currentTime + duration / 1000);
    osc.start(); osc.stop(AUDIO_CTX.currentTime + duration / 1000);
  } catch(e) {}
}
function notifySound(type = 'message') {
  if (type === 'message') { playBeep(900, 100); setTimeout(() => playBeep(1200, 100), 120); }
  else if (type === 'success') { playBeep(800, 80); setTimeout(() => playBeep(1000, 80), 90); setTimeout(() => playBeep(1300, 120), 180); }
  else if (type === 'error') { playBeep(400, 200); }
}

// ============ WISHLIST ============
function saveWishlist() { localStorage.setItem('wishlist', JSON.stringify(STATE.wishlist)); updateWishBadge(); }
function updateWishBadge() {
  const b = $('wishBadge');
  if (!b) return;
  if (STATE.wishlist.length > 0) { b.textContent = STATE.wishlist.length; b.classList.remove('hidden'); }
  else b.classList.add('hidden');
}
function toggleWishlist(item) {
  const idx = STATE.wishlist.findIndex(w => w.id === item.id);
  if (idx >= 0) { STATE.wishlist.splice(idx, 1); toast('Wishlist မှ ဖျက်ပြီ', 'success'); }
  else { STATE.wishlist.push({ id: item.id, name: item.name, price: item.price, game_id: item.game_id }); toast('Wishlist ထဲ ထည့်ပြီ ❤️', 'success'); }
  saveWishlist();
}
if ($('wishlistBtn')) $('wishlistBtn').addEventListener('click', () => { renderWishlist(); show('wishlistModal'); });
function renderWishlist() {
  const box = $('wishlistContent');
  if (!box) return;
  if (!STATE.wishlist.length) { box.innerHTML = '<p class="hint" style="text-align:center;padding:20px">Wishlist အလွတ်ဖြစ်နေတယ်။ ❤️ နှိပ်ပြီး ထည့်ပါ။</p>'; return; }
  box.innerHTML = STATE.wishlist.map(w => `
    <div class="item-row" style="margin-bottom:8px">
      <div><div style="font-weight:600">${w.name}</div><div class="hint">${w.game_id}</div></div>
      <div class="price">${Number(w.price).toLocaleString()} Ks</div>
    </div>
  `).join('');
}

// ============ INIT ============
async function init() {
  try {
    const cfg = await (await fetch('/api/config')).json();
    if (!cfg.enabled) { hide('loading'); showMaintenanceScreen(); return; }
    STATE.payments = cfg.payments || {};
  } catch(e) { hide('loading'); toast('Server မချိတ်နိုင်ပါ', 'error'); return; }
  const me = await api('/api/me', { method: 'POST', body: '{}' });
  hide('loading');
  if (!me.user) show('login');
  else {
    STATE.user = me.user;
    show('main');
    renderMain();
    loadGames();
    loadBanners();
    checkUnread();
  }
}

// ============ REGISTER / LOGIN ============
if ($('registerBtn')) $('registerBtn').addEventListener('click', async () => {
  const name = $('nameInput').value.trim();
  const phone = $('phoneInput').value.trim();
  const password = $('passwordInput').value;
  const password2 = $('passwordInput2').value;
  if (name.length < 2) return toast('နာမည် ထည့်ပါ', 'error');
  if (!/^[0-9+\-\s]{6,}$/.test(phone)) return toast('ဖုန်းနံပါတ် မှန်ကန်စွာ', 'error');
  if (password.length < 4) return toast('စကားဝှက် 4 လုံး+', 'error');
  if (password !== password2) return toast('စကားဝှက် မတူပါ', 'error');
  const res = await api('/api/register', { method: 'POST', body: JSON.stringify({ name, phone, password, password2 }) });
  if (res.ok) {
    STATE.user = res.user;
    hide('register'); show('main');
    renderMain(); loadGames(); loadBanners();
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    toast('အကောင့်ဖွင့်ပြီးပါပြီ 🎉', 'success');
  } else toast(res.error || 'မအောင်မြင်ပါ', 'error');
});

if ($('loginBtn')) $('loginBtn').addEventListener('click', async () => {
  const phone = $('loginPhone').value.trim();
  const password = $('loginPassword').value;
  if (!phone || !password) return toast('ဖုန်းနှင့် စကားဝှက် ထည့်ပါ', 'error');
  const res = await api('/api/login', { method: 'POST', body: JSON.stringify({ phone, password }) });
  if (res.ok) {
    STATE.user = res.user;
    hide('login'); show('main');
    renderMain(); loadGames(); loadBanners();
    checkUnread();
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    toast('အကောင့်ဝင်ပြီးပါပြီ ✅', 'success');
  } else toast(res.error || 'မအောင်မြင်ပါ', 'error');
});

if ($('showLoginBtn')) $('showLoginBtn').addEventListener('click', () => { hide('register'); show('login'); });
if ($('showRegisterBtn')) $('showRegisterBtn').addEventListener('click', () => { hide('login'); show('register'); });

// ============ PROFILE / LOGOUT ============
if ($('profileBtn')) $('profileBtn').addEventListener('click', () => {
  const u = STATE.user; if (!u) return;
  $('profileInfo').innerHTML = `
    <div class="item-row" style="margin-bottom:8px"><div>📛 နာမည်</div><div class="price">${u.name || u.first_name || '-'}</div></div>
    <div class="item-row" style="margin-bottom:8px"><div>📱 ဖုန်း</div><div class="price">${u.phone || '-'}</div></div>
    <div class="item-row" style="margin-bottom:8px"><div>🆔 User ID</div><div class="price">#${u.id}</div></div>
    <div class="item-row" style="margin-bottom:8px"><div>💰 Balance</div><div class="price">${Number(u.balance || 0).toLocaleString()} MMK</div></div>
    <div class="item-row" style="margin-bottom:8px"><div>📅 မှတ်ပုံတင်</div><div class="price">${new Date((u.created_at||0)*1000).toLocaleDateString()}</div></div>`;
  show('profileModal');
});

if ($('logoutBtn')) $('logoutBtn').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST', body: '{}' });
  STATE.user = null;
  hide('profileModal'); hide('main');
  $('loginPhone').value = ''; $('loginPassword').value = '';
  $('phoneInput').value = ''; $('nameInput').value = ''; $('passwordInput').value = ''; $('passwordInput2').value = '';
  show('login'); toast('ထွက်ပြီးပါပြီ', 'success');
});

function renderMain() {
  const bv = $('balanceVal'); if (bv) bv.textContent = Number(STATE.user.balance || 0).toLocaleString();
  const ul = $('userLabel'); if (ul) ul.textContent = `${STATE.user.name || STATE.user.first_name || ''} • ${STATE.user.phone || ''}`;
}
async function refreshMe() {
  const me = await api('/api/me', { method: 'POST', body: '{}' });
  if (me.user) { STATE.user = me.user; renderMain(); }
}

// ============ BANNERS ============
let bannerTimer = null;
async function loadBanners() {
  const res = await api('/api/banners');
  STATE.banners = res.banners || [];
  if (!STATE.banners.length) { hide('bannerSlider'); return; }
  const track = $('bannerTrack');
  const dots = $('bannerDots');
  if (!track || !dots) return;
  track.innerHTML = '';
  dots.innerHTML = '';
  STATE.banners.forEach((b, i) => {
    const div = document.createElement('div');
    div.className = 'banner';
    div.style.background = `linear-gradient(135deg,${b.color1},${b.color2})`;
    div.innerHTML = `<h3>${b.title}</h3><p>${b.subtitle || ''}</p>`;
    track.appendChild(div);
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dots.appendChild(dot);
  });
  let idx = 0;
  if (bannerTimer) clearInterval(bannerTimer);
  bannerTimer = setInterval(() => {
    idx = (idx + 1) % STATE.banners.length;
    track.style.transform = `translateX(-${idx * 100}%)`;
    dots.querySelectorAll('span').forEach((s, i) => s.classList.toggle('active', i === idx));
  }, 3500);
}

// ============ GAMES ============
async function loadGames() {
  const grid = $('gamesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton skeleton-game';
    grid.appendChild(sk);
  }
  const res = await api('/api/games');
  STATE.games = res.games || [];
  grid.innerHTML = '';
  STATE.games.forEach(g => {
    const div = document.createElement('div');
    div.className = 'game-card';
    div.innerHTML = `<img src="${g.image || ''}" alt="${g.name}" onerror="this.style.display='none'"/><div class="name">${g.name}</div>`;
    div.addEventListener('click', () => openItems(g));
    grid.appendChild(div);
  });
  animateCards(grid);
}

// ============ ITEMS ============
async function openItems(game) {
  STATE.selectedGame = game;
  $('itemsTitle').textContent = game.name;
  $('itemSearch').value = '';
  const box = $('itemsList');
  box.innerHTML = '';
  const skGrid = document.createElement('div');
  skGrid.className = 'items-grid';
  for (let i = 0; i < 6; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton skeleton-item';
    skGrid.appendChild(sk);
  }
  box.appendChild(skGrid);
  show('itemsModal');
  const res = await api(`/api/items/${game.id}`);
  STATE.items = res.items || [];
  renderItems('');
}

function renderItems(query) {
  const box = $('itemsList');
  box.innerHTML = '';
  let items = STATE.items;
  if (query) items = items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
  if (!items.length) { box.innerHTML = '<p class="hint" style="text-align:center;padding:20px">Item မရှိပါ။</p>'; return; }
  const game = STATE.selectedGame;
  if (game.id === 'app-premium') {
    const groups = {};
    items.forEach(it => { const cat = it.category || '📦 အခြား'; if (!groups[cat]) groups[cat] = []; groups[cat].push(it); });
    Object.entries(groups).forEach(([cat, list]) => {
      const title = document.createElement('div');
      title.className = 'category-title';
      title.textContent = cat;
      box.appendChild(title);
      const grid = document.createElement('div');
      grid.className = 'items-grid';
      list.forEach(it => grid.appendChild(makeItemCard(it)));
      box.appendChild(grid);
    });
  } else {
    const grid = document.createElement('div');
    grid.className = 'items-grid';
    items.forEach(it => grid.appendChild(makeItemCard(it)));
    box.appendChild(grid);
  }
  animateCards(box);
}
if ($('itemSearch')) $('itemSearch').addEventListener('input', (e) => renderItems(e.target.value));

function makeItemCard(it) {
  const card = document.createElement('div');
  card.className = 'item-card';
  const inWish = STATE.wishlist.some(w => w.id === it.id);
  card.innerHTML = `
    <button class="wish-heart">${inWish ? '❤️' : '🤍'}</button>
    <div class="item-name">${it.name}</div>
    <div class="item-price">${it.price > 0 ? Number(it.price).toLocaleString() + ' Ks' : 'စျေးမသတ်ရသေး'}</div>
    <button ${it.price>0?'':'disabled'} class="item-buy">ဝယ်မယ်</button>`;
  card.querySelector('.item-buy').addEventListener('click', () => openBuy(it));
  card.querySelector('.wish-heart').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleWishlist(it);
    renderItems($('itemSearch').value);
  });
  return card;
}

function openBuy(item) {
  STATE.selectedItem = item;
  $('buyItemName').textContent = item.name;
  $('buyItemPrice').textContent = Number(item.price).toLocaleString();
  $('buyGameAccount').value = '';
  $('buyServerId').value = '';
  const gameId = item.game_id;
  const isAppPremium = gameId === 'app-premium';
  hide('fieldServerId');
  hide('fieldNote');
  show('fieldGameId');
  if (isAppPremium) { hide('fieldGameId'); show('fieldNote'); }
  else if (gameId === 'mlbb' || gameId === 'magic-chess') { show('fieldServerId'); $('gameIdLabel').textContent = 'Game ID'; $('buyGameAccount').placeholder = 'Game ID ထည့်ပါ'; }
  else if (gameId === 'pubg') { $('gameIdLabel').textContent = 'PUBG ID'; $('buyGameAccount').placeholder = 'PUBG ID ထည့်ပါ'; }
  hide('itemsModal');
  show('buyModal');
}

if ($('confirmBuy')) $('confirmBuy').addEventListener('click', async () => {
  const item = STATE.selectedItem;
  const isAppPremium = item.game_id === 'app-premium';
  const needsServer = (item.game_id === 'mlbb' || item.game_id === 'magic-chess');
  let account = '', serverId = '';
  if (!isAppPremium) {
    account = $('buyGameAccount').value.trim();
    if (account.length < 3) return toast('Game ID ထည့်ပါ', 'error');
    if (needsServer) {
      serverId = $('buyServerId').value.trim();
      if (serverId.length < 1) return toast('Server ID ထည့်ပါ', 'error');
    }
  }
  const res = await api('/api/purchase', { method: 'POST', body: JSON.stringify({ item_id: item.id, game_account: account, server_id: serverId }) });
  if (res.ok) {
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    showConfetti();
    toast('ဝယ်ယူမှု တောင်းဆိုပြီးပါပြီ ✅', 'success');
    hide('buyModal');
    await refreshMe();
  } else { shakeElement($('buyModal')); toast(res.error || 'မအောင်မြင်ပါ', 'error'); }
});

// ============ DEPOSIT ============
if ($('depositBtn')) $('depositBtn').addEventListener('click', () => {
  $('depAmount').value = '';
  $('receiptInput').value = '';
  STATE.selectedMethod = null;
  document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
  hide('payInfo');
  show('depositModal');
});
document.querySelectorAll('.qa-btn').forEach(b => {
  b.addEventListener('click', () => { $('depAmount').value = b.dataset.amt; });
});
document.querySelectorAll('.pay-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    STATE.selectedMethod = btn.dataset.method;
    const info = STATE.payments[STATE.selectedMethod.toLowerCase()] || '';
    $('payInfo').innerHTML = `<div><b>${btn.textContent}</b> သို့ ငွေလွှဲပါ</div><div style="margin-top:6px">📱 ${info}</div><div class="hint" style="margin-top:6px">ငွေလွှဲပြီးပါက ပြေစာပုံ တင်ပါ။</div>`;
    show('payInfo');
  });
});
if ($('submitDeposit')) $('submitDeposit').addEventListener('click', async () => {
  const amount = Number($('depAmount').value);
  const file = $('receiptInput').files[0];
  if (!amount || amount < 500) return toast('အနည်းဆုံး 500 MMK', 'error');
  if (!STATE.selectedMethod) return toast('နည်းလမ်း ရွေးပါ', 'error');
  if (!file) return toast('ပြေစာပုံ တင်ပါ', 'error');
  const fd = new FormData();
  fd.append('amount', amount);
  fd.append('method', STATE.selectedMethod);
  fd.append('receipt', file);
  const res = await fetch('/api/deposit', { method: 'POST', headers: { 'X-Init-Data': initData }, body: fd }).then(r => r.json());
  if (res.ok) {
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    showConfetti();
    toast('Admin ထံ ပို့ပြီးပါပြီ ⏳', 'success');
    hide('depositModal');
    await refreshMe();
  } else toast(res.error || 'မအောင်မြင်ပါ', 'error');
});

// ============ HISTORY + TRACKING ============
if ($('historyBtn')) $('historyBtn').addEventListener('click', async () => {
  show('historyModal');
  const box = $('historyList');
  box.innerHTML = '<p class="hint" style="text-align:center">ခဏစောင့်ပါ...</p>';
  const [txs, orders, deps] = await Promise.all([api('/api/my-tx'), api('/api/my-orders'), api('/api/deposits')]);
  let html = '<h3 style="margin:10px 0 6px">💳 Transactions</h3>';
  if ((txs.txs||[]).length) html += txs.txs.map(t => `<div class="item-row" style="margin-bottom:6px"><div>${t.type}<div class="hint">${new Date(t.created_at*1000).toLocaleString()}</div></div><div class="price">${t.amount>0?'+':''}${t.amount} → ${t.balance_after}</div></div>`).join('');
  else html += '<p class="hint">မရှိပါ</p>';
  html += '<h3 style="margin:16px 0 6px">📥 Deposits</h3>';
  if ((deps.deposits||[]).length) html += deps.deposits.map(d => `<div class="item-row" style="margin-bottom:6px"><div>${d.method} #${d.id}<div class="hint">${new Date(d.created_at*1000).toLocaleString()}</div></div><div class="price">${d.amount} <small>${d.status}</small></div></div>`).join('');
  else html += '<p class="hint">မရှိပါ</p>';
  html += '<h3 style="margin:16px 0 6px">🛒 Orders</h3>';
  if ((orders.orders||[]).length) html += orders.orders.map(o => `
    <div class="item-row" style="margin-bottom:6px;cursor:pointer" onclick="openTrack(${o.id})">
      <div>${o.item_name}<div class="hint">#${o.id} • ${o.game_id} • ${o.status}</div></div>
      <div class="price">${o.price} 📍</div>
    </div>`).join('');
  else html += '<p class="hint">မရှိပါ</p>';
  box.innerHTML = html;
});

window.openTrack = async (orderId) => {
  hide('historyModal');
  show('trackModal');
  const box = $('trackContent');
  box.innerHTML = '<p class="hint" style="text-align:center">ခဏစောင့်ပါ...</p>';
  const res = await api(`/api/order/${orderId}`);
  if (!res.ok) { box.innerHTML = '<p class="hint" style="text-align:center">Order မတွေ့ပါ။</p>'; return; }
  const { order, timeline } = res;
  let html = `<div class="card" style="margin-bottom:14px"><div style="font-weight:700;font-size:15px">#${order.id} ${order.item_name}</div><div class="hint" style="margin-top:4px">${order.price} Ks • ${order.game_id}</div></div>`;
  timeline.forEach((t, i) => {
    setTimeout(() => {
      const step = document.querySelector(`.track-step[data-i="${i}"]`);
      if (step) step.classList.add('done');
    }, i * 300);
    html += `<div class="track-step ${t.done ? 'done' : ''}" data-i="${i}">
      <div class="track-dot">${t.done ? '✓' : '○'}</div>
      <div class="track-info">
        <div class="track-label">${t.label}</div>
        ${t.at ? `<div class="track-time">${new Date(t.at * 1000).toLocaleString()}</div>` : ''}
      </div></div>`;
  });
  box.innerHTML = html;
};

// ============ CHAT ============
if ($('chatBtn')) $('chatBtn').addEventListener('click', async () => {
  CHAT.open = true;
  show('chatModal');
  $('chatMessages').innerHTML = '<p class="hint" style="text-align:center">ခဏစောင့်ပါ...</p>';
  await loadChat(true);
  $('chatBadge').style.display = 'none';
  if (CHAT.timer) clearInterval(CHAT.timer);
  CHAT.timer = setInterval(() => loadChat(false), 3000);
});

function closeChat() {
  CHAT.open = false;
  if (CHAT.timer) { clearInterval(CHAT.timer); CHAT.timer = null; }
}

async function loadChat(scrollBottom) {
  if (!CHAT.open) return;
  const res = await api('/api/chat/history', { method: 'POST', body: '{}' });
  const msgs = res.messages || [];
  const box = $('chatMessages');
  if (!msgs.length) {
    box.innerHTML = '<p class="hint" style="text-align:center">စကားပြောဆိုမှု မရှိသေးပါ။ Admin ကို စာ ပို့ပါ။</p>';
    return;
  }
  if (CHAT.open && msgs.length > CHAT.lastCount && CHAT.lastCount > 0) {
    const newAdmin = msgs.slice(CHAT.lastCount).filter(m => m.from === 'admin');
    if (newAdmin.length > 0) notifySound('message');
  }
  CHAT.lastCount = msgs.length;
  let lastDate = '';
  let html = '';
  msgs.forEach(m => {
    const d = new Date(m.created_at * 1000);
    const dateStr = d.toLocaleDateString();
    if (dateStr !== lastDate) { html += `<div class="chat-date-divider">${dateStr}</div>`; lastDate = dateStr; }
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const cls = m.from === 'user' ? 'user' : 'admin';
    const safeText = m.text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    html += `<div class="chat-msg ${cls}">${safeText}<div class="chat-time">${time}</div></div>`;
  });
  const wasAtBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 50;
  box.innerHTML = html;
  if (scrollBottom || wasAtBottom) box.scrollTop = box.scrollHeight;
}

if ($('chatSendBtn')) $('chatSendBtn').addEventListener('click', sendChat);
if ($('chatInput')) $('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendChat(); } });
async function sendChat() {
  const text = $('chatInput').value.trim();
  if (!text) return;
  $('chatInput').value = '';
  $('chatSendBtn').disabled = true;
  const res = await api('/api/chat/send', { method: 'POST', body: JSON.stringify({ text }) });
  $('chatSendBtn').disabled = false;
  if (res.ok) {
    try { tg.HapticFeedback.impactOccurred('light'); } catch(e){}
    await loadChat(true);
  } else {
    toast(res.error || 'မပို့နိုင်ပါ', 'error');
    $('chatInput').value = text;
  }
}

async function checkUnread() {
  if (CHAT.open || !STATE.user) return;
  try {
    const res = await api('/api/chat/unread', { method: 'POST', body: '{}' });
    const badge = $('chatBadge');
    if (!badge) return;
    if (res.count > 0) { badge.textContent = res.count; badge.style.display = 'inline-block'; }
    else { badge.style.display = 'none'; }
  } catch(e) {}
}
setInterval(checkUnread, 15000);

// ============ AUTO REFRESH ============
async function autoRefresh() {
  if (!STATE.user || CHAT.open) return;
  if ($('main').classList.contains('hidden')) return;
  try {
    const me = await api('/api/me', { method: 'POST', body: '{}' });
    if (me.user) {
      const oldBal = Number(STATE.user.balance || 0);
      const newBal = Number(me.user.balance || 0);
      STATE.user = me.user;
      renderMain();
      if (newBal > oldBal) {
        const diff = newBal - oldBal;
        toast(`💰 +${diff.toLocaleString()} MMK ရောက်ပါပြီ!`, 'success');
        try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
      }
    }
  } catch(e) {}
}
setInterval(autoRefresh, 8000);

// ============ MODAL CLOSE ============
document.querySelectorAll('[data-close]').forEach(b => {
  b.addEventListener('click', (e) => {
    const m = e.target.closest('.modal');
    if (m) { m.classList.add('hidden'); if (m.id === 'chatModal') closeChat(); }
  });
});
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', (e) => {
    if (e.target === m) { m.classList.add('hidden'); if (m.id === 'chatModal') closeChat(); }
  });
});

// ===============================
// MAINTENANCE SCREEN (လှလှပပ)
// ===============================
function showMaintenanceScreen() {
  if (document.getElementById('maintenanceOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'maintenanceOverlay';
  overlay.innerHTML = `
    <div class="mt-bg-blob mt-blob-1"></div>
    <div class="mt-bg-blob mt-blob-2"></div>
    <div class="mt-content">
      <div class="mt-icon">
        <div class="mt-gear mt-gear-1">⚙️</div>
        <div class="mt-gear mt-gear-2">⚙️</div>
        <div class="mt-center">🛠️</div>
      </div>
      <h1 class="mt-title">ခဏစောင့်ပါ</h1>
      <p class="mt-subtitle">ဆိုင်ကို ခေတ္တပြင်ဆင်နေပါသည်</p>
      <div class="mt-progress"><div class="mt-progress-bar"></div></div>
      <p class="mt-note">ခဏနေမှ ပြန်လာကြည့်ပေးပါ 🙏</p>
    </div>
  `;
  document.body.appendChild(overlay);
  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
  }
}

// ===============================
// ANIMATION FUNCTIONS
// ===============================
function showToast(message, type = 'info', duration = 2500) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toastEl = document.createElement('div');
  toastEl.className = `toast ${type}`;
  toastEl.textContent = message;
  document.body.appendChild(toastEl);
  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred(type === 'error' ? 'error' : 'success');
  }
  setTimeout(() => {
    toastEl.style.transition = 'opacity 0.3s, transform 0.3s';
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translate(-50%, 20px)';
    setTimeout(() => toastEl.remove(), 300);
  }, duration);
}

function animateNumber(element, targetValue, duration = 1000) {
  if (!element) return;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(targetValue * easeProgress);
    element.textContent = current.toLocaleString() + ' Ks';
    if (progress < 1) requestAnimationFrame(update);
    else element.textContent = targetValue.toLocaleString() + ' Ks';
  }
  requestAnimationFrame(update);
}

function showSkeleton(container, count = 3) {
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    skeleton.style.cssText = 'height:80px;margin-bottom:10px;';
    container.appendChild(skeleton);
  }
}

function animateCards(container) {
  if (!container) return;
  const cards = container.querySelectorAll('.card, .game-card, .item-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 50);
  });
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button, .btn');
  if (!btn) return;
  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
  }
  const ripple = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.cssText = `position:absolute;width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px;background:rgba(255,255,255,0.4);border-radius:50%;transform:scale(0);animation:rippleAnim 0.6s ease-out;pointer-events:none;`;
  if (getComputedStyle(btn).position === 'static') {
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
  }
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

function showConfetti() {
  const colors = ['#2ea6ff', '#27ae60', '#f39c12', '#e74c3c', '#6a5cff'];
  for (let i = 0; i < 30; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `position:fixed;top:-10px;left:${Math.random() * 100}vw;width:8px;height:8px;background:${colors[Math.floor(Math.random() * colors.length)]};border-radius:50%;z-index:99998;pointer-events:none;animation:confettiFall ${1.5 + Math.random()}s ease-in forwards;`;
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 3000);
  }
}

function shakeElement(element) {
  if (!element) return;
  element.classList.add('shake');
  setTimeout(() => element.classList.remove('shake'), 400);
  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('fade-in');
});

// ============ START ============
updateWishBadge();
init();
