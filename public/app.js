const tg = window.Telegram.WebApp;
tg.ready(); tg.expand();
try { tg.setHeaderColor('secondary_bg_color'); } catch(e){}

const $ = (id) => document.getElementById(id);
const initData = tg.initData || '';
const TG_BOT_USERNAME = 'SafeZoneGametopup26_bot';
const TG_SHARE_URL = 'https://t.me/' + TG_BOT_USERNAME;

let STATE = { user: null, games: [], items: [], selectedMethod: null, selectedItem: null, selectedGame: null, payments: {}, banners: [], wishlist: JSON.parse(localStorage.getItem('wishlist') || '[]') };
let CHAT = { open: false, timer: null, lastCount: 0 };
let AUDIO_CTX = null;
let FEATURES = { loyalty: true, referral: true, spin: true };

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Init-Data': initData, ...(opts.headers || {}) };
  const res = await fetch(path, { ...opts, headers });
  return res.json();
}
function toast(msg, type = '') {
  const t = $('toast'); if (!t) return;
  t.textContent = msg; t.className = 'toast ' + type; t.classList.remove('hidden');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.add('hidden'), 3000);
  if (type === 'success') notifySound('success');
  else if (type === 'error') notifySound('error');
}
function show(id) { const el = $(id); if (el) el.classList.remove('hidden'); }
function hide(id) { const el = $(id); if (el) el.classList.add('hidden'); }

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
  const b = $('wishBadge'); if (!b) return;
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
  const box = $('wishlistContent'); if (!box) return;
  if (!STATE.wishlist.length) { box.innerHTML = '<p class="hint" style="text-align:center;padding:20px">Wishlist အလွတ်ဖြစ်နေတယ်။ ❤️ နှိပ်ပြီး ထည့်ပါ။</p>'; return; }
  box.innerHTML = STATE.wishlist.map(w => '<div class="item-row" style="margin-bottom:8px"><div><div style="font-weight:600">' + w.name + '</div><div class="hint">' + w.game_id + '</div></div><div class="price">' + Number(w.price).toLocaleString() + ' Ks</div></div>').join('');
}

// ============ INIT ============
async function init() {
  try {
    const cfg = await (await fetch('/api/config')).json();
    if (!cfg.enabled) { hide('loading'); showMaintenanceScreen(); return; }
    STATE.payments = cfg.payments || {};
    if (cfg.features) FEATURES = cfg.features;
  } catch(e) { hide('loading'); toast('Server မချိတ်နိုင်ပါ', 'error'); return; }
  const me = await api('/api/me', { method: 'POST', body: '{}' });
  hide('loading');
  if (!me.user) { show('login'); }
  else {
    STATE.user = me.user;
    show('main');
    if ($('bottomNav')) $('bottomNav').classList.remove('hidden');
    renderMain();
    loadGames();
    loadBanners();
    checkUnread();
    refreshFeatures();
  }
}

// ============ LOGIN / REGISTER ============
if ($('loginBtn')) $('loginBtn').addEventListener('click', async () => {
  const phone = $('loginPhone').value.trim();
  const password = $('loginPassword').value;
  if (!phone || !password) return toast('ဖုန်းနှင့် စကားဝှက် ထည့်ပါ', 'error');
  const res = await api('/api/login', { method: 'POST', body: JSON.stringify({ phone, password }) });
  if (res.ok) {
    STATE.user = res.user;
    hide('login'); show('main');
    if ($('bottomNav')) $('bottomNav').classList.remove('hidden');
    renderMain(); loadGames(); loadBanners(); checkUnread(); refreshFeatures();
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    toast('အကောင့်ဝင်ပြီးပါပြီ ✅', 'success');
  } else toast(res.error || 'မအောင်မြင်ပါ', 'error');
});

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
    if ($('bottomNav')) $('bottomNav').classList.remove('hidden');
    renderMain(); loadGames(); loadBanners(); refreshFeatures();
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    toast('အကောင့်ဖွင့်ပြီးပါပြီ 🎉', 'success');
  } else toast(res.error || 'မအောင်မြင်ပါ', 'error');
});

if ($('showLoginBtn')) $('showLoginBtn').addEventListener('click', () => { hide('register'); show('login'); });
if ($('showRegisterBtn')) $('showRegisterBtn').addEventListener('click', () => { hide('login'); show('register'); });

// ============ PROFILE / LOGOUT ============
if ($('profileBtn')) $('profileBtn').addEventListener('click', () => {
  const u = STATE.user; if (!u) return;
  $('profileInfo').innerHTML =
    '<div class="item-row" style="margin-bottom:8px"><div>📛 နာမည်</div><div class="price">' + (u.name || u.first_name || '-') + '</div></div>' +
    '<div class="item-row" style="margin-bottom:8px"><div>📱 ဖုန်း</div><div class="price">' + (u.phone || '-') + '</div></div>' +
    '<div class="item-row" style="margin-bottom:8px"><div>🆔 User ID</div><div class="price">#' + u.id + '</div></div>' +
    '<div class="item-row" style="margin-bottom:8px"><div>💰 Balance</div><div class="price">' + Number(u.balance || 0).toLocaleString() + ' MMK</div></div>' +
    '<div class="item-row" style="margin-bottom:8px"><div>⭐ Points</div><div class="price">' + Number(u.points || 0).toLocaleString() + '</div></div>' +
    '<div class="item-row" style="margin-bottom:8px"><div>📅 မှတ်ပုံတင်</div><div class="price">' + new Date((u.created_at || 0) * 1000).toLocaleDateString() + '</div></div>';
  show('profileModal');
});

if ($('logoutBtn')) $('logoutBtn').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST', body: '{}' });
  STATE.user = null;
  hide('profileModal'); hide('main'); hide('bottomNav');
  if ($('loginPhone')) $('loginPhone').value = '';
  if ($('loginPassword')) $('loginPassword').value = '';
  show('login'); toast('ထွက်ပြီးပါပြီ', 'success');
});

if ($('profileBtn2')) {
  $('profileBtn2').addEventListener('click', () => { if ($('profileBtn')) $('profileBtn').click(); });
}

function renderMain() {
  const bv = $('balanceVal'); if (bv) bv.textContent = Number(STATE.user.balance || 0).toLocaleString();
  const ul = $('userLabel'); if (ul) ul.textContent = (STATE.user.name || STATE.user.first_name || '') + ' • ' + (STATE.user.phone || '');
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
    div.style.background = 'linear-gradient(135deg,' + b.color1 + ',' + b.color2 + ')';
    div.innerHTML = '<h3>' + b.title + '</h3><p>' + (b.subtitle || '') + '</p>';
    track.appendChild(div);
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dots.appendChild(dot);
  });
  let idx = 0;
  if (bannerTimer) clearInterval(bannerTimer);
  bannerTimer = setInterval(() => {
    idx = (idx + 1) % STATE.banners.length;
    track.style.transform = 'translateX(-' + (idx * 100) + '%)';
    dots.querySelectorAll('span').forEach((s, i) => s.classList.toggle('active', i === idx));
  }, 3500);
}

// ============ GAMES ============
async function loadGames() {
  const grid = $('gamesGrid'); if (!grid) return;
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
    div.innerHTML = '<img src="' + (g.image || '') + '" alt="' + g.name + '" onerror="this.style.display=\'none\'"/><div class="name">' + g.name + '</div>';
    div.addEventListener('click', () => openItems(g));
    grid.appendChild(div);
  });
}

// ============ ITEMS ============
async function openItems(game) {
  STATE.selectedGame = game;
  if ($('itemsTitle')) $('itemsTitle').textContent = game.name;
  if ($('itemSearch')) $('itemSearch').value = '';
  const box = $('itemsList'); if (!box) return;
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
  const res = await api('/api/items/' + game.id);
  STATE.items = res.items || [];
  renderItems('');
}

function renderItems(query) {
  const box = $('itemsList'); if (!box) return;
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
}
if ($('itemSearch')) $('itemSearch').addEventListener('input', (e) => renderItems(e.target.value));

function makeItemCard(it) {
  const card = document.createElement('div');
  card.className = 'item-card';
  const inWish = STATE.wishlist.some(w => w.id === it.id);
  const autoBadge = it.auto_delivery ? ' <span style="background:#27ae60;color:#fff;font-size:9px;padding:2px 5px;border-radius:8px">⚡</span>' : '';
  const priceText = it.price > 0 ? Number(it.price).toLocaleString() + ' Ks' : 'စျေးမသတ်ရသေး';
  const disabled = it.price > 0 ? '' : 'disabled';
  card.innerHTML = '<button class="wish-heart">' + (inWish ? '❤️' : '🤍') + '</button>' +
    '<div class="item-name">' + it.name + autoBadge + '</div>' +
    '<div class="item-price">' + priceText + '</div>' +
    '<button ' + disabled + ' class="item-buy">ဝယ်မယ်</button>';
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
  if ($('buyItemName')) $('buyItemName').textContent = item.name;
  if ($('buyItemPrice')) $('buyItemPrice').textContent = Number(item.price).toLocaleString();
  if ($('buyGameAccount')) $('buyGameAccount').value = '';
  if ($('buyServerId')) $('buyServerId').value = '';
  const gameId = item.game_id;
  const isAppPremium = gameId === 'app-premium';
  hide('fieldServerId');
  hide('fieldNote');
  show('fieldGameId');
  if (isAppPremium) { hide('fieldGameId'); show('fieldNote'); }
  else if (gameId === 'mlbb' || gameId === 'magic-chess') { show('fieldServerId'); if ($('gameIdLabel')) $('gameIdLabel').textContent = 'Game ID'; if ($('buyGameAccount')) $('buyGameAccount').placeholder = 'Game ID ထည့်ပါ'; }
  else if (gameId === 'pubg') { if ($('gameIdLabel')) $('gameIdLabel').textContent = 'PUBG ID'; if ($('buyGameAccount')) $('buyGameAccount').placeholder = 'PUBG ID ထည့်ပါ'; }
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
    toast(res.auto_delivered ? '⚡ ချက်ချင်း ပို့ပြီးပါပြီ!' : 'ဝယ်ယူမှု တောင်းဆိုပြီးပါပြီ ✅', 'success');
    hide('buyModal');
    await refreshMe();
  } else { shakeElement($('buyModal')); toast(res.error || 'မအောင်မြင်ပါ', 'error'); }
});

// ============ DEPOSIT ============
if ($('depositBtn')) $('depositBtn').addEventListener('click', () => {
  if ($('depAmount')) $('depAmount').value = '';
  if ($('receiptInput')) $('receiptInput').value = '';
  STATE.selectedMethod = null;
  document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
  hide('payInfo');
  show('depositModal');
});
document.querySelectorAll('.qa-btn').forEach(b => {
  b.addEventListener('click', () => { if ($('depAmount')) $('depAmount').value = b.dataset.amt; });
});
document.querySelectorAll('.pay-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    STATE.selectedMethod = btn.dataset.method;
    const info = STATE.payments[STATE.selectedMethod.toLowerCase()] || '';
    const pi = $('payInfo');
    if (pi) {
      pi.innerHTML = '<div><b>' + btn.textContent + '</b> သို့ ငွေလွှဲပါ</div><div style="margin-top:6px">📱 ' + info + '</div><div class="hint" style="margin-top:6px">ငွေလွှဲပြီးပါက ပြေစာပုံ တင်ပါ။</div>';
      pi.classList.remove('hidden');
    }
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

// ============ HISTORY ============
if ($('historyBtn')) $('historyBtn').addEventListener('click', async () => {
  show('historyModal');
  const box = $('historyList'); if (!box) return;
  box.innerHTML = '<p class="hint" style="text-align:center">ခဏစောင့်ပါ...</p>';
  const txs = await api('/api/my-tx');
  const orders = await api('/api/my-orders');
  const deps = await api('/api/deposits');
  let html = '<h3 style="margin:10px 0 6px">💳 Transactions</h3>';
  if (txs.txs && txs.txs.length) html += txs.txs.map(t => '<div class="item-row" style="margin-bottom:6px"><div>' + t.type + '<div class="hint">' + new Date(t.created_at * 1000).toLocaleString() + '</div></div><div class="price">' + (t.amount > 0 ? '+' : '') + t.amount + ' → ' + t.balance_after + '</div></div>').join('');
  else html += '<p class="hint">မရှိပါ</p>';
  html += '<h3 style="margin:16px 0 6px">📥 Deposits</h3>';
  if (deps.deposits && deps.deposits.length) html += deps.deposits.map(d => '<div class="item-row" style="margin-bottom:6px"><div>' + d.method + ' #' + d.id + '<div class="hint">' + new Date(d.created_at * 1000).toLocaleString() + '</div></div><div class="price">' + d.amount + ' <small>' + d.status + '</small></div></div>').join('');
  else html += '<p class="hint">မရှိပါ</p>';
  html += '<h3 style="margin:16px 0 6px">🛒 Orders</h3>';
  if (orders.orders && orders.orders.length) html += orders.orders.map(o => '<div class="item-row" style="margin-bottom:6px;cursor:pointer" onclick="openTrack(' + o.id + ')"><div>' + o.item_name + '<div class="hint">#' + o.id + ' • ' + o.game_id + ' • ' + o.status + '</div></div><div class="price">' + o.price + ' 📍</div></div>').join('');
  else html += '<p class="hint">မရှိပါ</p>';
  box.innerHTML = html;
});

window.openTrack = async (orderId) => {
  hide('historyModal');
  show('trackModal');
  const box = $('trackContent'); if (!box) return;
  box.innerHTML = '<p class="hint" style="text-align:center">ခဏစောင့်ပါ...</p>';
  const res = await api('/api/order/' + orderId);
  if (!res.ok) { box.innerHTML = '<p class="hint" style="text-align:center">Order မတွေ့ပါ။</p>'; return; }
  const order = res.order;
  const timeline = res.timeline;
  let html = '<div class="card" style="margin-bottom:14px;padding:12px;background:#1a1d26;border-radius:10px"><div style="font-weight:700;font-size:15px">#' + order.id + ' ' + order.item_name + '</div><div class="hint" style="margin-top:4px">' + order.price + ' Ks • ' + order.game_id + '</div></div>';
  timeline.forEach(t => {
    html += '<div class="track-step ' + (t.done ? 'done' : '') + '">' +
      '<div class="track-dot">' + (t.done ? '✓' : '○') + '</div>' +
      '<div class="track-info">' +
      '<div class="track-label">' + t.label + '</div>' +
      (t.at ? '<div class="track-time">' + new Date(t.at * 1000).toLocaleString() + '</div>' : '') +
      '</div></div>';
  });
  box.innerHTML = html;
};

// ============ CHAT ============
if ($('chatBtn')) $('chatBtn').addEventListener('click', async () => {
  CHAT.open = true;
  show('chatModal');
  if ($('chatMessages')) $('chatMessages').innerHTML = '<p class="hint" style="text-align:center">ခဏစောင့်ပါ...</p>';
  await loadChat(true);
  if ($('chatBadge')) $('chatBadge').classList.add('hidden');
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
  const box = $('chatMessages'); if (!box) return;
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
    if (dateStr !== lastDate) { html += '<div style="text-align:center;font-size:11px;color:#8a90a0;margin:12px 0;padding:4px 12px;background:#1a1d26;border-radius:10px;display:inline-block;width:auto">' + dateStr + '</div>'; lastDate = dateStr; }
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const cls = m.from === 'user' ? 'user' : 'admin';
    const safeText = m.text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    html += '<div class="chat-msg ' + cls + '">' + safeText + '<div class="chat-time">' + time + '</div></div>';
  });
  const wasAtBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 50;
  box.innerHTML = html;
  if (scrollBottom || wasAtBottom) box.scrollTop = box.scrollHeight;
}

if ($('chatSendBtn')) $('chatSendBtn').addEventListener('click', sendChat);
if ($('chatInput')) $('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendChat(); } });
async function sendChat() {
  const input = $('chatInput'); if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  if ($('chatSendBtn')) $('chatSendBtn').disabled = true;
  const res = await api('/api/chat/send', { method: 'POST', body: JSON.stringify({ text: text }) });
  if ($('chatSendBtn')) $('chatSendBtn').disabled = false;
  if (res.ok) {
    try { tg.HapticFeedback.impactOccurred('light'); } catch(e){}
    await loadChat(true);
  } else {
    toast(res.error || 'မပို့နိုင်ပါ', 'error');
    input.value = text;
  }
}

async function checkUnread() {
  if (CHAT.open || !STATE.user) return;
  try {
    const res = await api('/api/chat/unread', { method: 'POST', body: '{}' });
    const badge = $('chatBadge'); if (!badge) return;
    if (res.count > 0) { badge.textContent = res.count; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }
  } catch(e) {}
}
setInterval(checkUnread, 15000);

// ============ FEATURES (Points / Referral / Spin / Promo) ============
async function refreshFeatures() {
  if (!STATE.user) return;
  if (FEATURES.loyalty) {
    try {
      const res = await api('/api/points/balance', { method: 'POST', body: '{}' });
      if (res.ok) { const el = $('dashPoints'); if (el) el.textContent = Number(res.points || 0).toLocaleString(); }
    } catch(e) {}
  }
  if (FEATURES.referral) {
    try {
      const res = await api('/api/referral/info', { method: 'POST', body: '{}' });
      if (res.ok) { const el = $('dashReferral'); if (el) el.textContent = (res.stats && res.stats.count) || 0; }
    } catch(e) {}
  }
  if (FEATURES.spin) {
    try {
      const res = await api('/api/spin/info', { method: 'POST', body: '{}' });
      if (res.ok) { const el = $('dashSpin'); if (el) el.textContent = res.canSpin ? 'Play' : '✓ Done'; }
    } catch(e) {}
  }
  // Feature Cards ဖျောက်/ပြ
  const ptCard = document.querySelector('.dashboard-card.points');
  if (ptCard) ptCard.style.display = FEATURES.loyalty ? 'block' : 'none';
  const refCard = document.querySelector('.dashboard-card.referral');
  if (refCard) refCard.style.display = FEATURES.referral ? 'block' : 'none';
  const spinCard = document.querySelector('.dashboard-card.spin');
  if (spinCard) spinCard.style.display = FEATURES.spin ? 'block' : 'none';
}

// ============ POINTS ============
window.openPointsModal = async () => {
  if (!FEATURES.loyalty) return toast('Points Feature ပိတ်ထားပါသည်', 'error');
  show('pointsModal');
  const balRes = await api('/api/points/balance', { method: 'POST', body: '{}' });
  const histRes = await api('/api/points/history', { method: 'POST', body: '{}' });
  if (balRes.ok) {
    if ($('pointsBig')) $('pointsBig').textContent = Number(balRes.points || 0).toLocaleString();
    if ($('pointsRate')) $('pointsRate').textContent = balRes.rate || 10;
    if ($('pointsMin')) $('pointsMin').textContent = balRes.minRedeem || 100;
  }
  const hbox = $('pointsHistoryBox');
  if (!hbox) return;
  if (histRes.ok && histRes.history && histRes.history.length) {
    hbox.innerHTML = histRes.history.map(h => {
      const color = h.points > 0 ? '#27ae60' : '#e74c3c';
      const sign = h.points > 0 ? '+' : '';
      return '<div style="display:flex;justify-content:space-between;padding:8px;background:#1a1d26;border-radius:8px;margin-bottom:6px;font-size:12px">' +
        '<div>' + h.reason + '<br><span style="color:#8a90a0">' + new Date(h.created_at * 1000).toLocaleString() + '</span></div>' +
        '<div style="color:' + color + ';font-weight:700">' + sign + h.points + '</div></div>';
    }).join('');
  } else {
    hbox.innerHTML = '<p style="color:#8a90a0;text-align:center;font-size:13px;padding:12px">မှတ်တမ်း မရှိပါ</p>';
  }
};

window.redeemPoints = async () => {
  const input = $('pointsRedeemInput'); if (!input) return;
  const points = Number(input.value);
  if (!points) return toast('Points ထည့်ပါ', 'error');
  const res = await api('/api/points/redeem', { method: 'POST', body: JSON.stringify({ points: points }) });
  if (res.ok) {
    toast('✅ +' + res.ksValue.toLocaleString() + ' Ks!', 'success');
    showConfetti();
    await refreshMe();
    await refreshFeatures();
    openPointsModal();
  } else toast(res.error || 'မအောင်မြင်ပါ', 'error');
};

// ============ REFERRAL ============
window.openReferralModal = async () => {
  if (!FEATURES.referral) return toast('Referral Feature ပိတ်ထားပါသည်', 'error');
  show('referralModal');
  const res = await api('/api/referral/info', { method: 'POST', body: '{}' });
  if (res.ok) {
    if ($('refCodeDisplay')) $('refCodeDisplay').textContent = res.code || '------';
    if ($('refCount')) $('refCount').textContent = (res.stats && res.stats.count) || 0;
    if ($('refEarned')) $('refEarned').textContent = Number((res.stats && res.stats.earned) || 0).toLocaleString();
  }
};

window.copyRefCode = () => {
  const code = $('refCodeDisplay') ? $('refCodeDisplay').textContent : '';
  if (!code || code === '------') return;
  try {
    navigator.clipboard.writeText(code);
    toast('📋 Code ကူးပြီ', 'success');
  } catch(e) { toast('Code: ' + code, 'info'); }
};

window.shareRefCode = () => {
  const code = $('refCodeDisplay') ? $('refCodeDisplay').textContent : '';
  if (!code || code === '------') return;
  const text = '🎁 Safe Zone Game Topup မှာ ကျွန်တော့်ရဲ့ Referral Code "' + code + '" နဲ့ အကောင့်ဖွင့်ပြီး Bonus ငွေ ရယူပါ!';
  const url = 'https://t.me/share/url?url=' + encodeURIComponent(TG_SHARE_URL) + '&text=' + encodeURIComponent(text);
  window.open(url, '_blank');
};

// ============ SPIN WHEEL (FIXED WITH TRIG POSITIONING) ============
window.openSpinModal = async function() {
  if (!FEATURES.spin) return toast('Lucky Spin ပိတ်ထားပါသည်', 'error');
  show('spinModal');
  try {
    const res = await api('/api/spin/info', { method: 'POST', body: '{}' });
    if (!res.ok) {
      toast(res.error || 'Spin မဖွင့်ထားပါ', 'error');
      return;
    }
    const rewards = res.rewards && res.rewards.length ? res.rewards : [100, 200, 300, 500, 1000, 2000, 5000];
    renderSpinWheel(rewards);

    const info = $('spinRewardsInfo');
    if (info) {
      info.innerHTML = '🎁 <b>ရနိုင်တဲ့ ဆုများ:</b> ' + rewards.map(r => r >= 1000 ? (r / 1000) + 'K' : r).join(' • ');
    }

    const btn = $('spinBtn');
    const limitEl = $('spinLimit');
    if (limitEl) limitEl.textContent = res.limit || 1;
    if (btn) {
      if (!res.canSpin) {
        btn.disabled = true;
        btn.textContent = '✅ ဒီနေ့ လှည့်ပြီး (' + res.todayCount + '/' + res.limit + ')';
      } else {
        btn.disabled = false;
        btn.textContent = '🎰 SPIN လှည့်မယ်';
      }
    }
  } catch(e) { toast('Server Error', 'error'); }
};

function renderSpinWheel(rewards) {
  const wheel = $('spinWheel');
  if (!wheel) return;

  // Reset
  wheel.innerHTML = '';
  wheel.style.position = 'relative';
  wheel.style.overflow = 'hidden';

  const colors = ['#e74c3c', '#f39c12', '#27ae60', '#2ea6ff', '#6a5cff', '#e91e63', '#ff9800', '#00bcd4'];
  const count = rewards.length;
  const anglePer = 360 / count;

  // 1. Conic Gradient ဖြင့် ကွက်အရောင်များ ဆွဲ
  const conicParts = [];
  for (let i = 0; i < count; i++) {
    const start = i * anglePer;
    const end = (i + 1) * anglePer;
    conicParts.push(colors[i % colors.length] + ' ' + start + 'deg ' + end + 'deg');
  }
  wheel.style.background = 'conic-gradient(' + conicParts.join(',') + ')';

  // 2. စာသားများကို ကွက်အလယ်တွင် ထားရန် Trigonometry ဖြင့် တွက်
  // Wheel size = 300px → radius = 150px
  // ဒါပေမယ့် စာသားကို ကွက်အလယ် (radius 60%) မှာ ထားရမယ် → 90px
  const wheelRadius = 150; // CSS ထဲက .spin-wheel-wrapper = 300px
  const labelRadius = wheelRadius * 0.62; // ကွက်အလယ်

  for (let i = 0; i < count; i++) {
    const midAngle = (i * anglePer) + (anglePer / 2);
    // 12 နာရီ (top) ကို 0° လို့ ယူပြီး နာရီလက်တံအတိုင်း
    const rad = (midAngle - 90) * Math.PI / 180;
    const x = labelRadius * Math.cos(rad);
    const y = labelRadius * Math.sin(rad);

    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.left = '50%';
    label.style.top = '50%';
    label.style.transform = 'translate(calc(-50% + ' + x + 'px), calc(-50% + ' + y + 'px))';
    label.style.fontSize = '15px';
    label.style.fontWeight = '900';
    label.style.color = '#ffffff';
    label.style.textShadow = '0 2px 6px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.7)';
    label.style.whiteSpace = 'nowrap';
    label.style.pointerEvents = 'none';
    label.style.zIndex = '5';
    label.style.fontFamily = 'inherit';
    label.style.letterSpacing = '0.5px';
    label.style.padding = '2px 6px';
    label.style.background = 'rgba(0,0,0,0.35)';
    label.style.borderRadius = '6px';
    label.style.border = '1px solid rgba(255,255,255,0.2)';

    const reward = rewards[i];
    let text;
    if (reward >= 1000000) text = (reward / 1000000) + 'M';
    else if (reward >= 1000) text = (reward / 1000) + 'K';
    else text = String(reward);
    label.textContent = text;

    wheel.appendChild(label);
  }
}

window.playSpin = async function() {
  const btn = $('spinBtn');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.textContent = '🎰 လှည့်နေသည်...';
  try {
    const res = await api('/api/spin/play', { method: 'POST', body: '{}' });
    if (!res.ok) {
      toast(res.error || 'မအောင်မြင်ပါ', 'error');
      btn.disabled = false;
      btn.textContent = '🎰 SPIN လှည့်မယ်';
      return;
    }
    const wheel = $('spinWheel');
    if (wheel) {
      const spinDeg = 1800 + Math.floor(Math.random() * 360);
      wheel.style.transform = 'rotate(' + spinDeg + 'deg)';
    }
    try { tg.HapticFeedback.impactOccurred('heavy'); } catch(e) {}
    setTimeout(async () => {
      toast('🎉 +' + Number(res.reward).toLocaleString() + ' Ks!', 'success');
      try { tg.HapticFeedback.notificationOccurred('success'); } catch(e) {}
      await refreshMe();
      await refreshFeatures();
      showConfetti();
      if (wheel) {
        wheel.style.transition = 'none';
        wheel.style.transform = 'rotate(0deg)';
        setTimeout(() => { wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)'; }, 100);
      }
      setTimeout(() => { window.openSpinModal(); }, 300);
    }, 4200);
  } catch(e) {
    toast('Server Error', 'error');
    btn.disabled = false;
    btn.textContent = '🎰 SPIN လှည့်မယ်';
  }
};

// ============ PROMO ============
window.openPromoModal = () => {
  show('promoModal');
  const inp = $('promoInput');
  const res = $('promoResult');
  if (inp) inp.value = '';
  if (res) res.innerHTML = '';
};

window.redeemPromo = async () => {
  const inp = $('promoInput'); if (!inp) return;
  const code = inp.value.trim();
  if (!code) return toast('Code ထည့်ပါ', 'error');
  try {
    const res = await api('/api/promo/redeem', { method: 'POST', body: JSON.stringify({ code: code }) });
    const box = $('promoResult');
    if (res.ok) {
      if (box) box.innerHTML = '<span style="color:#27ae60">✅ +' + Number(res.bonus).toLocaleString() + ' Ks</span>';
      toast('🎉 +' + Number(res.bonus).toLocaleString() + ' Ks!', 'success');
      showConfetti();
      await refreshMe();
    } else {
      if (box) box.innerHTML = '<span style="color:#e74c3c">❌ ' + res.error + '</span>';
      toast(res.error || 'မအောင်မြင်ပါ', 'error');
    }
  } catch(e) { toast('Server Error', 'error'); }
};

// ============ AUTO REFRESH ============
async function autoRefresh() {
  if (!STATE.user || CHAT.open) return;
  if ($('main') && $('main').classList.contains('hidden')) return;
  try {
    const me = await api('/api/me', { method: 'POST', body: '{}' });
    if (me.user) {
      const oldBal = Number(STATE.user.balance || 0);
      const newBal = Number(me.user.balance || 0);
      STATE.user = me.user;
      renderMain();
      if (newBal > oldBal) {
        const diff = newBal - oldBal;
        toast('💰 +' + diff.toLocaleString() + ' MMK ရောက်ပါပြီ!', 'success');
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

// ============ MAINTENANCE SCREEN ============
function showMaintenanceScreen() {
  if (document.getElementById('maintenanceOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'maintenanceOverlay';
  overlay.innerHTML =
    '<div class="mt-bg-blob mt-blob-1"></div>' +
    '<div class="mt-bg-blob mt-blob-2"></div>' +
    '<div class="mt-content">' +
    '<div class="mt-icon"><div class="mt-center">🛠️</div></div>' +
    '<h1 class="mt-title">ခဏစောင့်ပါ</h1>' +
    '<p class="mt-subtitle">ဆိုင်ကို ခေတ္တပြင်ဆင်နေပါသည်</p>' +
    '<div class="mt-progress"><div class="mt-progress-bar"></div></div>' +
    '<p class="mt-note">ခဏနေမှ ပြန်လာကြည့်ပေးပါ 🙏</p>' +
    '</div>';
  document.body.appendChild(overlay);
}

// ============ ANIMATIONS ============
function showConfetti() {
  const colors = ['#2ea6ff', '#27ae60', '#f39c12', '#e74c3c', '#6a5cff'];
  for (let i = 0; i < 30; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = 'position:fixed;top:-10px;left:' + (Math.random() * 100) + 'vw;width:8px;height:8px;background:' + colors[Math.floor(Math.random() * colors.length)] + ';border-radius:50%;z-index:99998;pointer-events:none;animation:confettiFall ' + (1.5 + Math.random()) + 's ease-in forwards;';
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 3000);
  }
}
function shakeElement(element) {
  if (!element) return;
  element.style.animation = 'none';
  void element.offsetWidth;
  element.style.animation = 'shake 0.4s ease';
  setTimeout(() => { element.style.animation = ''; }, 400);
  try { tg.HapticFeedback.notificationOccurred('error'); } catch(e) {}
}

// ============ START ============
const confettiStyle = document.createElement('style');
confettiStyle.textContent = '@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}';
document.head.appendChild(confettiStyle);

updateWishBadge();
init();

// ==========================================
// GLOBAL HAPTIC FEEDBACK
// ==========================================
(function() {
  if (!window.Telegram || !window.Telegram.WebApp || !window.Telegram.WebApp.HapticFeedback) return;

  function vibrate(type) {
    try {
      var hf = window.Telegram.WebApp.HapticFeedback;
      if (type === 'heavy') hf.impactOccurred('heavy');
      else if (type === 'medium') hf.impactOccurred('medium');
      else if (type === 'rigid') hf.impactOccurred('rigid');
      else hf.impactOccurred('light');
    } catch(e) {}
  }

  function handleClick(e) {
    var el = e.target;
    if (!el) return;

    // ဘယ်အရာတွေကို နှိပ်ရင် တုန်ခါမလဲ
    var target = el.closest('button, .btn, .nav-btn, .game-card, .item-card, .dashboard-card, .pay-btn, .qa-btn, .header-btn, .modal-close, .banner, .spin-btn, .referral-share, .item-buy, .wish-heart, a, [role="button"]');

    if (!target) return;

    // Class အလိုက် တုန်ခါမှု ပမာဏ ကွဲ
    var cls = target.className || '';
    var strength = 'light';

    if (cls.indexOf('spin-btn') >= 0) strength = 'heavy';
    else if (cls.indexOf('item-buy') >= 0 || cls.indexOf('confirmBuy') >= 0 || cls.indexOf('submitDeposit') >= 0) strength = 'medium';
    else if (cls.indexOf('dashboard-card') >= 0 || cls.indexOf('game-card') >= 0) strength = 'medium';
    else if (cls.indexOf('nav-btn') >= 0) strength = 'light';
    else if (cls.indexOf('btn-primary') >= 0 || cls.indexOf('btn-success') >= 0) strength = 'medium';
    else if (cls.indexOf('wish-heart') >= 0) strength = 'light';
    else if (cls.indexOf('header-btn') >= 0) strength = 'light';
    else if (cls.indexOf('modal-close') >= 0) strength = 'light';
    else if (cls.indexOf('pay-btn') >= 0 || cls.indexOf('qa-btn') >= 0) strength = 'light';

    vibrate(strength);
  }

  document.addEventListener('touchstart', handleClick, { passive: true });
  document.addEventListener('mousedown', handleClick, { passive: true });
})();
