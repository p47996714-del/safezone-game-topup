const tg = window.Telegram.WebApp;
tg.ready(); tg.expand();
try { tg.setHeaderColor('secondary_bg_color'); } catch(e){}

const $ = (id) => document.getElementById(id);
const initData = tg.initData || '';
const TG_BOT_USERNAME = 'SafeZoneGametopup26_bot';
const ADMIN_CONTACT_CLEAN = 'pyae_phyo_12327';

let STATE = { user: null, games: [], items: [], selectedMethod: null, selectedItem: null, selectedGame: null, payments: {}, banners: [], wishlist: JSON.parse(localStorage.getItem('wishlist') || '[]') };
let CHAT = { open: false, timer: null, lastCount: 0 };
let AUDIO_CTX = null;
let FEATURES = { loyalty: true, referral: true, spin: true };
window.SOUND_ENABLED = localStorage.getItem('sound_enabled') !== 'false';

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
  if (!window.SOUND_ENABLED) return;
  if (type === 'message') { playBeep(900, 100); setTimeout(() => playBeep(1200, 100), 120); }
  else if (type === 'success') { playBeep(800, 80); setTimeout(() => playBeep(1000, 80), 90); setTimeout(() => playBeep(1300, 120), 180); }
  else if (type === 'error') { playBeep(400, 200); }
}

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
    renderMain(); loadGames(); loadBanners(); checkUnread(); refreshFeatures(); loadFeatured();
  }
}

if ($('loginBtn')) $('loginBtn').addEventListener('click', async () => {
  const phone = $('loginPhone').value.trim();
  const password = $('loginPassword').value;
  if (!phone || !password) return toast('ဖုန်းနှင့် စကားဝှက် ထည့်ပါ', 'error');
  const res = await api('/api/login', { method: 'POST', body: JSON.stringify({ phone, password }) });
  if (res.ok) {
    STATE.user = res.user;
    hide('login'); show('main');
    if ($('bottomNav')) $('bottomNav').classList.remove('hidden');
    renderMain(); loadGames(); loadBanners(); checkUnread(); refreshFeatures(); loadFeatured();
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    toast('အကောင့်ဝင်ပြီးပါပြီ ✅', 'success');
  } else toast(res.error || 'မအောင်မြင်ပါ', 'error');
});

// REGISTER with Referral Code
if ($('registerBtn')) $('registerBtn').addEventListener('click', async () => {
  const name = $('nameInput').value.trim();
  const phone = $('phoneInput').value.trim();
  const password = $('passwordInput').value;
  const password2 = $('passwordInput2').value;
  const referralCode = $('referralInput') ? $('referralInput').value.trim().toUpperCase() : '';

  if (name.length < 2) return toast('နာမည် ထည့်ပါ', 'error');
  if (!/^[0-9+\-\s]{6,}$/.test(phone)) return toast('ဖုန်းနံပါတ် မှန်ကန်စွာ', 'error');
  if (password.length < 4) return toast('စကားဝှက် 4 လုံး+', 'error');
  if (password !== password2) return toast('စကားဝှက် မတူပါ', 'error');

  const termsCheck = $('termsCheck');
  if (termsCheck && !termsCheck.checked) {
    shakeElement(termsCheck.parentElement);
    return toast('⚠️ Terms & Privacy ကို သဘောတူပါ', 'error');
  }

  const btn = $('registerBtn');
  btn.disabled = true;
  btn.textContent = '⏳ စောင့်ပါ...';

  const res = await api('/api/register', { method: 'POST', body: JSON.stringify({ name, phone, password, password2, referral_code: referralCode || null }) });

  btn.disabled = false;
  btn.textContent = '✨ Register';

  if (res.ok) {
    STATE.user = res.user;
    sessionStorage.removeItem('pending_referral');
    hide('register'); show('main');
    if ($('bottomNav')) $('bottomNav').classList.remove('hidden');
    renderMain(); loadGames(); loadBanners(); refreshFeatures(); loadFeatured();
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    showConfetti();

    if (res.referral && res.referral.ok) {
      setTimeout(() => toast('🎁 Bonus ' + Number(res.referral.inviteeBonus || 0).toLocaleString() + ' Ks ရပါပြီ!', 'success'), 1200);
      setTimeout(() => toast('🎉 ဖိတ်ခေါ်သူကိုလည်း ' + Number(res.referral.inviterBonus || 0).toLocaleString() + ' Ks Bonus ပေးပါပြီ', 'success'), 4200);
    } else if (referralCode && res.referral && !res.referral.ok) {
      setTimeout(() => toast('⚠️ Code မမှန်ပါ — ဒါပေမယ့် Register အောင်မြင်ပါပြီ', 'error'), 1000);
    } else {
      toast('အကောင့်ဖွင့်ပြီးပါပြီ 🎉', 'success');
    }
  } else toast(res.error || 'မအောင်မြင်ပါ', 'error');
});

if ($('showLoginBtn')) $('showLoginBtn').addEventListener('click', () => { hide('register'); show('login'); });
if ($('showRegisterBtn')) $('showRegisterBtn').addEventListener('click', () => {
  hide('login'); show('register');
  // Referral code auto-fill
  setTimeout(() => {
    const refInput = $('referralInput');
    const pending = sessionStorage.getItem('pending_referral');
    if (refInput && pending && !refInput.value) refInput.value = pending;
  }, 100);
});

// Auto-fill referral code စတင်ချိန်မှာ
setTimeout(() => {
  const refInput = $('referralInput');
  const pending = sessionStorage.getItem('pending_referral');
  if (refInput && pending) refInput.value = pending;
}, 500);

if ($('profileBtn')) $('profileBtn').addEventListener('click', () => {
  const u = STATE.user; if (!u) return;
  $('profileInfo').innerHTML =
    '<div class="item-row" style="margin-bottom:8px"><div>📛 နာမည်</div><div class="price">' + (u.name || u.first_name || '-') + '</div></div>' +
    '<div class="item-row" style="margin-bottom:8px"><div>📱 ဖုန်း</div><div class="price">' + (u.phone || '-') + '</div></div>' +
    '<div class="item-row" style="margin-bottom:8px"><div>🆔 User ID</div><div class="price">#' + u.id + '</div></div>' +
    '<div class="item-row" style="margin-bottom:8px"><div>💰 Balance</div><div class="price">' + Number(u.balance || 0).toLocaleString() + ' MMK</div></div>' +
    '<div class="item-row" style="margin-bottom:8px"><div>⭐ Points</div><div class="price">' + Number(u.points || 0).toLocaleString() + '</div></div>' +
    '<div class="item-row" style="margin-bottom:8px"><div>🎰 Spins</div><div class="price">' + Number(u.spins_available || 0) + '</div></div>' +
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

if ($('profileBtn2')) $('profileBtn2').addEventListener('click', () => { if ($('profileBtn')) $('profileBtn').click(); });

function renderMain() {
  const bv = $('balanceVal'); if (bv) bv.textContent = Number(STATE.user.balance || 0).toLocaleString();
  const ul = $('userLabel'); if (ul) ul.textContent = (STATE.user.name || STATE.user.first_name || '') + ' • ' + (STATE.user.phone || '');
}
async function refreshMe() {
  const me = await api('/api/me', { method: 'POST', body: '{}' });
  if (me.user) { STATE.user = me.user; renderMain(); }
}

let bannerTimer = null;
async function loadBanners() {
  const res = await api('/api/banners');
  STATE.banners = res.banners || [];
  if (!STATE.banners.length) { hide('bannerSlider'); return; }
  const track = $('bannerTrack'); const dots = $('bannerDots');
  if (!track || !dots) return;
  track.innerHTML = ''; dots.innerHTML = '';
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
  const nameEl = card.querySelector('.item-name');
  const priceEl = card.querySelector('.item-price');
  [nameEl, priceEl].forEach(el => {
    if (!el) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      STATE.selectedItem = it;
      openPreview(it);
    });
  });
  return card;
}

function openPreview(item) {
  show('previewModal');
  if ($('previewTitle')) $('previewTitle').textContent = item.name;
  const box = $('previewContent'); if (!box) return;
  const autoBadge = item.auto_delivery ? '<span style="background:#27ae60;color:#fff;font-size:10px;padding:3px 8px;border-radius:10px;margin-left:6px">⚡ Auto</span>' : '';
  const priceText = item.price > 0 ? Number(item.price).toLocaleString() + ' Ks' : 'စျေးမသတ်ရသေး';
  box.innerHTML =
    (item.image ? '<img class="preview-img" src="' + item.image + '" onerror="this.style.display=\'none\'" />' : '') +
    '<div class="preview-name">' + item.name + autoBadge + '</div>' +
    '<div class="preview-category">🎮 ' + (item.game_id || '-').toUpperCase() + (item.category ? ' • ' + item.category : '') + '</div>' +
    '<div class="preview-price">' + priceText + '</div>' +
    (item.auto_delivery ? '<p style="font-size:12px;color:#27ae60;text-align:center;margin-bottom:12px">⚡ ဝယ်တာနဲ့ ချက်ချင်း ပို့ပါမည်</p>' : '') +
    (item.price > 0 ? '<button class="btn-success btn-full" onclick="closePreviewAndBuy()">🛒 ဝယ်မယ်</button>' : '<button class="btn-full" disabled style="background:#2a2d36;color:#8a90a0;border:none;padding:12px;border-radius:10px;font-weight:700">စျေးမသတ်ရသေး</button>');
}
window.closePreviewAndBuy = function() {
  hide('previewModal');
  if (STATE.selectedItem) openBuy(STATE.selectedItem);
};

function openBuy(item) {
  STATE.selectedItem = item;
  if ($('buyItemName')) $('buyItemName').textContent = item.name;
  if ($('buyItemPrice')) $('buyItemPrice').textContent = Number(item.price).toLocaleString();
  if ($('buyGameAccount')) $('buyGameAccount').value = '';
  if ($('buyServerId')) $('buyServerId').value = '';
  const gameId = item.game_id;
  const isAppPremium = gameId === 'app-premium';
  hide('fieldServerId'); hide('fieldNote'); show('fieldGameId');
  if (isAppPremium) {
    hide('fieldGameId'); show('fieldNote'); hide('saveGameIdRow');
  } else {
    show('saveGameIdRow');
    if (gameId === 'mlbb' || gameId === 'magic-chess') {
      show('fieldServerId');
      if ($('gameIdLabel')) $('gameIdLabel').textContent = 'Game ID';
      if ($('buyGameAccount')) $('buyGameAccount').placeholder = 'Game ID ထည့်ပါ';
    } else if (gameId === 'pubg') {
      if ($('gameIdLabel')) $('gameIdLabel').textContent = 'PUBG ID';
      if ($('buyGameAccount')) $('buyGameAccount').placeholder = 'PUBG ID ထည့်ပါ';
    }
    try {
      const saved = JSON.parse(localStorage.getItem('saved_game_ids') || '{}')[gameId];
      if (saved && saved.account) {
        if ($('buyGameAccount')) $('buyGameAccount').value = saved.account;
        if ($('buyServerId') && saved.serverId) $('buyServerId').value = saved.serverId;
        if ($('saveGameIdCheck')) $('saveGameIdCheck').checked = true;
      } else {
        if ($('saveGameIdCheck')) $('saveGameIdCheck').checked = false;
      }
    } catch(e) {}
  }
  hide('itemsModal'); hide('previewModal'); show('buyModal');
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
    if ($('saveGameIdCheck') && $('saveGameIdCheck').checked && account) {
      try {
        const saved = JSON.parse(localStorage.getItem('saved_game_ids') || '{}');
        saved[item.game_id] = { account: account, serverId: serverId, savedAt: Date.now() };
        localStorage.setItem('saved_game_ids', JSON.stringify(saved));
      } catch(e) {}
    }
  }
  const res = await api('/api/purchase', { method: 'POST', body: JSON.stringify({ item_id: item.id, game_account: account, server_id: serverId }) });
  if (res.ok) {
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    showConfetti();
    hide('buyModal');
    await refreshMe();
    if (isAppPremium) {
      const orderId = res.order_id || '-';
      const infoEl = $('contactOrderInfo');
      if (infoEl) {
        infoEl.innerHTML =
          '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#8a90a0">Order ID</span><b style="color:#2ea6ff">#' + orderId + '</b></div>' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#8a90a0">Item</span><b style="color:#fff">' + item.name + '</b></div>' +
          '<div style="display:flex;justify-content:space-between"><span style="color:#8a90a0">ကျသင့်ငွေ</span><b style="color:#27ae60">' + Number(item.price).toLocaleString() + ' Ks</b></div>';
      }
      const linkEl = $('contactAdminLink');
      if (linkEl) linkEl.href = 'https://t.me/' + ADMIN_CONTACT_CLEAN;
      setTimeout(() => show('contactAdminModal'), 400);
    } else {
      toast(res.auto_delivered ? '⚡ ချက်ချင်း ပို့ပြီးပါပြီ!' : 'ဝယ်ယူမှု တောင်းဆိုပြီးပါပြီ ✅', 'success');
    }
  } else { shakeElement($('buyModal')); toast(res.error || 'မအောင်မြင်ပါ', 'error'); }
});

if ($('depositBtn')) $('depositBtn').addEventListener('click', () => {
  if ($('depAmount')) $('depAmount').value = '';
  if ($('receiptInput')) $('receiptInput').value = '';
  STATE.selectedMethod = null;
  document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
  hide('payInfo'); show('depositModal');
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
  if (orders.orders && orders.orders.length) html += orders.orders.map(o => '<div class="item-row" style="margin-bottom:6px;cursor:pointer;flex-wrap:wrap" onclick="openTrack(' + o.id + ')"><div style="flex:1"><div>' + o.item_name + '</div><div class="hint">#' + o.id + ' • ' + o.game_id + ' • ' + o.status + '</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><div class="price">' + o.price + ' 📍</div><button class="reorder-btn" onclick="event.stopPropagation();reOrder(' + o.id + ')">🔄 ပြန်ဝယ်</button></div></div>').join('');
  else html += '<p class="hint">မရှိပါ</p>';
  box.innerHTML = html;
});

window.reOrder = async function(orderId) {
  try {
    const res = await api('/api/my-orders');
    if (!res.ok || !res.orders) return toast('Order မတွေ့ပါ', 'error');
    const order = res.orders.find(o => o.id === Number(orderId));
    if (!order) return toast('Order မတွေ့ပါ', 'error');
    const games = await api('/api/games');
    if (!games.ok) return;
    const itemsRes = await api('/api/items/' + order.game_id);
    if (!itemsRes.ok || !itemsRes.items) return toast('Item မတွေ့ပါ', 'error');
    const item = itemsRes.items.find(i => i.name === order.item_name);
    if (!item) return toast('Item မတွေ့ပါ', 'error');
    if (!item.active) return toast('Item ပိတ်ထားပါသည်', 'error');
    hide('historyModal');
    STATE.selectedGame = games.games.find(g => g.id === order.game_id);
    STATE.selectedItem = item;
    openBuy(item);
    setTimeout(() => {
      if (order.game_account && $('buyGameAccount')) $('buyGameAccount').value = order.game_account;
      if (order.server_id && $('buyServerId')) $('buyServerId').value = order.server_id;
      toast('🔄 ပြန်ဝယ်ရန် အဆင်သင့်', 'success');
    }, 150);
  } catch(e) { toast('Error', 'error'); }
};

window.openTrack = async (orderId) => {
  hide('historyModal');
  show('trackModal');
  const box = $('trackContent'); if (!box) return;
  box.innerHTML = '<p class="hint" style="text-align:center">ခဏစောင့်ပါ...</p>';
  const res = await api('/api/order/' + orderId);
  if (!res.ok) { box.innerHTML = '<p class="hint" style="text-align:center">Order မတွေ့ပါ။</p>'; return; }
  const order = res.order; const timeline = res.timeline;
  let html = '<div style="margin-bottom:14px;padding:12px;background:#1a1d26;border-radius:10px"><div style="font-weight:700;font-size:15px">#' + order.id + ' ' + order.item_name + '</div><div class="hint" style="margin-top:4px">' + order.price + ' Ks • ' + order.game_id + '</div></div>';
  timeline.forEach(t => {
    html += '<div class="track-step ' + (t.done ? 'done' : '') + '"><div class="track-dot">' + (t.done ? '✓' : '○') + '</div><div class="track-info"><div class="track-label">' + t.label + '</div>' + (t.at ? '<div class="track-time">' + new Date(t.at * 1000).toLocaleString() + '</div>' : '') + '</div></div>';
  });
  box.innerHTML = html;
};

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
  if (!msgs.length) { box.innerHTML = '<p class="hint" style="text-align:center">စကားပြောဆိုမှု မရှိသေးပါ။</p>'; return; }
  if (CHAT.open && msgs.length > CHAT.lastCount && CHAT.lastCount > 0) {
    const newAdmin = msgs.slice(CHAT.lastCount).filter(m => m.from === 'admin');
    if (newAdmin.length > 0) notifySound('message');
  }
  CHAT.lastCount = msgs.length;
  let lastDate = ''; let html = '';
  msgs.forEach(m => {
    const d = new Date(m.created_at * 1000);
    const dateStr = d.toLocaleDateString();
    if (dateStr !== lastDate) { html += '<div style="text-align:center;font-size:11px;color:#8a90a0;margin:12px 0;padding:4px 12px;background:#1a1d26;border-radius:10px;display:inline-block">' + dateStr + '</div>'; lastDate = dateStr; }
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
  if (res.ok) { try { tg.HapticFeedback.impactOccurred('light'); } catch(e){} await loadChat(true); }
  else { toast(res.error || 'မပို့နိုင်ပါ', 'error'); input.value = text; }
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

async function refreshFeatures() {
  if (!STATE.user) return;
  if (FEATURES.loyalty) {
    try { const res = await api('/api/points/balance', { method: 'POST', body: '{}' }); if (res.ok) { const el = $('dashPoints'); if (el) el.textContent = Number(res.points || 0).toLocaleString(); } } catch(e) {}
  }
  if (FEATURES.referral) {
    try { const res = await api('/api/referral/info', { method: 'POST', body: '{}' }); if (res.ok) { const el = $('dashReferral'); if (el) el.textContent = (res.stats && res.stats.count) || 0; } } catch(e) {}
  }
  if (FEATURES.spin) {
    try { const res = await api('/api/spin/info', { method: 'POST', body: '{}' }); if (res.ok) { const el = $('dashSpin'); if (el) el.textContent = res.canSpin ? 'Play' : '✓ Done'; } } catch(e) {}
  }
  const ptCard = document.querySelector('.dashboard-card.points');
  if (ptCard) ptCard.style.display = FEATURES.loyalty ? 'block' : 'none';
  const refCard = document.querySelector('.dashboard-card.referral');
  if (refCard) refCard.style.display = FEATURES.referral ? 'block' : 'none';
  const spinCard = document.querySelector('.dashboard-card.spin');
  if (spinCard) spinCard.style.display = FEATURES.spin ? 'block' : 'none';
}

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
  const hbox = $('pointsHistoryBox'); if (!hbox) return;
  if (histRes.ok && histRes.history && histRes.history.length) {
    hbox.innerHTML = histRes.history.map(h => {
      const color = h.points > 0 ? '#27ae60' : '#e74c3c';
      const sign = h.points > 0 ? '+' : '';
      return '<div style="display:flex;justify-content:space-between;padding:8px;background:#1a1d26;border-radius:8px;margin-bottom:6px;font-size:12px"><div>' + h.reason + '<br><span style="color:#8a90a0">' + new Date(h.created_at * 1000).toLocaleString() + '</span></div><div style="color:' + color + ';font-weight:700">' + sign + h.points + '</div></div>';
    }).join('');
  } else { hbox.innerHTML = '<p style="color:#8a90a0;text-align:center;font-size:13px;padding:12px">မှတ်တမ်း မရှိပါ</p>'; }
};

window.redeemPoints = async () => {
  const input = $('pointsRedeemInput'); if (!input) return;
  const points = Number(input.value);
  if (!points) return toast('Points ထည့်ပါ', 'error');
  const res = await api('/api/points/redeem', { method: 'POST', body: JSON.stringify({ points: points }) });
  if (res.ok) { toast('✅ +' + res.ksValue.toLocaleString() + ' Ks!', 'success'); showConfetti(); await refreshMe(); await refreshFeatures(); openPointsModal(); }
  else toast(res.error || 'မအောင်မြင်ပါ', 'error');
};

window.openReferralModal = async () => {
  if (!FEATURES.referral) return toast('Referral Feature ပိတ်ထားပါသည်', 'error');
  show('referralModal');
  const res = await api('/api/referral/info', { method: 'POST', body: '{}' });
  if (res.ok) {
    if ($('refCodeDisplay')) $('refCodeDisplay').textContent = res.code || '------';
    if ($('refCount')) $('refCount').textContent = (res.stats && res.stats.count) || 0;
    if ($('refEarned')) $('refEarned').textContent = Number((res.stats && res.stats.earned) || 0).toLocaleString();
    if (res.tgLink) window._lastTgLink = res.tgLink;
  }
};

window.copyRefCode = () => {
  const code = $('refCodeDisplay') ? $('refCodeDisplay').textContent : '';
  if (!code || code === '------') return;
  try { navigator.clipboard.writeText(code); toast('📋 Code ကူးပြီ', 'success'); }
  catch(e) { toast('Code: ' + code, 'info'); }
};

window.shareRefCode = async () => {
  const code = $('refCodeDisplay') ? $('refCodeDisplay').textContent : '';
  if (!code || code === '------') return;
  try {
    const res = await api('/api/referral/info', { method: 'POST', body: '{}' });
    const tgLink = (res.ok && res.tgLink) ? res.tgLink : ('https://t.me/' + TG_BOT_USERNAME + '?start=' + code);
    const text = '🎁 Safe Zone Game Topup မှာ ကျွန်တော့်ရဲ့ Referral Code "' + code + '" နဲ့ အကောင့်ဖွင့်ပြီး Bonus ငွေ ရယူပါ!';
    const shareUrl = 'https://t.me/share/url?url=' + encodeURIComponent(tgLink) + '&text=' + encodeURIComponent(text);
    window.open(shareUrl, '_blank');
  } catch(e) {
    const fallback = 'https://t.me/share/url?url=' + encodeURIComponent('https://t.me/' + TG_BOT_USERNAME + '?start=' + code);
    window.open(fallback, '_blank');
  }
};

window.openSpinModal = async function() {
  if (!FEATURES.spin) return toast('Lucky Spin ပိတ်ထားပါသည်', 'error');
  show('spinModal');
  try {
    const res = await api('/api/spin/info', { method: 'POST', body: '{}' });
    if (!res.ok) { toast(res.error || 'Spin မဖွင့်ထားပါ', 'error'); return; }
    const rewards = res.rewards && res.rewards.length ? res.rewards : [100, 200, 300, 500, 1000, 2000, 5000];
    renderSpinWheel(rewards);
    const info = $('spinRewardsInfo');
    if (info) info.innerHTML = '🎁 <b>ရနိုင်တဲ့ ဆုများ:</b> ' + rewards.map(r => r >= 1000 ? (r / 1000) + 'K' : r).join(' • ');
    const btn = $('spinBtn'); const limitEl = $('spinLimit');
    if (limitEl) limitEl.textContent = res.available || 0;
    if (btn) {
      if (!res.canSpin) { btn.disabled = true; btn.textContent = '❌ Spin အခွင့်အရေး မရှိပါ'; }
      else { btn.disabled = false; btn.textContent = '🎰 SPIN လှည့်မယ် (' + res.available + ' ခါ)'; }
    }
  } catch(e) { toast('Server Error', 'error'); }
};

function renderSpinWheel(rewards) {
  const wheel = $('spinWheel'); if (!wheel) return;
  wheel.innerHTML = '';
  wheel.style.position = 'relative'; wheel.style.overflow = 'hidden';
  const colors = ['#e74c3c', '#f39c12', '#27ae60', '#2ea6ff', '#6a5cff', '#e91e63', '#ff9800', '#00bcd4'];
  const count = rewards.length;
  const anglePer = 360 / count;
  const conicParts = [];
  for (let i = 0; i < count; i++) conicParts.push(colors[i % colors.length] + ' ' + (i * anglePer) + 'deg ' + ((i + 1) * anglePer) + 'deg');
  wheel.style.background = 'conic-gradient(' + conicParts.join(',') + ')';
  const labelRadius = 150 * 0.62;
  for (let i = 0; i < count; i++) {
    const midAngle = (i * anglePer) + (anglePer / 2);
    const rad = (midAngle - 90) * Math.PI / 180;
    const x = labelRadius * Math.cos(rad);
    const y = labelRadius * Math.sin(rad);
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.left = '50%'; label.style.top = '50%';
    label.style.transform = 'translate(calc(-50% + ' + x + 'px), calc(-50% + ' + y + 'px))';
    label.style.fontSize = '15px'; label.style.fontWeight = '900';
    label.style.color = '#ffffff'; label.style.textShadow = '0 2px 6px rgba(0,0,0,0.95)';
    label.style.whiteSpace = 'nowrap'; label.style.pointerEvents = 'none'; label.style.zIndex = '5';
    label.style.padding = '2px 6px'; label.style.background = 'rgba(0,0,0,0.35)';
    label.style.borderRadius = '6px'; label.style.border = '1px solid rgba(255,255,255,0.2)';
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
  const btn = $('spinBtn'); if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.textContent = '🎰 လှည့်နေသည်...';
  try {
    const res = await api('/api/spin/play', { method: 'POST', body: '{}' });
    if (!res.ok) { toast(res.error || 'မအောင်မြင်ပါ', 'error'); btn.disabled = false; btn.textContent = '🎰 SPIN လှည့်မယ်'; return; }
    const wheel = $('spinWheel');
    if (wheel) { const spinDeg = 1800 + Math.floor(Math.random() * 360); wheel.style.transform = 'rotate(' + spinDeg + 'deg)'; }
    try { tg.HapticFeedback.impactOccurred('heavy'); } catch(e) {}
    setTimeout(async () => {
      toast('🎉 +' + Number(res.reward).toLocaleString() + ' Ks!', 'success');
      try { tg.HapticFeedback.notificationOccurred('success'); } catch(e) {}
      await refreshMe(); await refreshFeatures(); showConfetti();
      if (wheel) {
        wheel.style.transition = 'none';
        wheel.style.transform = 'rotate(0deg)';
        setTimeout(() => { wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)'; }, 100);
      }
      setTimeout(() => { window.openSpinModal(); }, 300);
    }, 4200);
  } catch(e) { toast('Server Error', 'error'); btn.disabled = false; btn.textContent = '🎰 SPIN လှည့်မယ်'; }
};

window.openPromoModal = () => {
  show('promoModal');
  if ($('promoInput')) $('promoInput').value = '';
  if ($('promoResult')) $('promoResult').innerHTML = '';
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

async function loadFeatured() {
  try {
    const res = await api('/api/featured');
    if (!res.ok || !res.topItems || !res.topItems.length) return;
    const main = $('main'); if (!main) return;
    if ($('featuredSection')) return;
    const section = document.createElement('div');
    section.id = 'featuredSection';
    section.style.cssText = 'margin:0 16px 20px';
    let html = '<div style="margin-bottom:10px;font-size:15px;font-weight:700;color:#fff">🔥 အရောင်းရဆုံး</div>';
    html += '<div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:6px">';
    res.topItems.slice(0, 8).forEach(it => {
      const img = it.image ? '<img src="' + it.image + '" style="width:100%;height:60px;object-fit:contain;border-radius:8px;margin-bottom:6px" onerror="this.style.display=\'none\'"/>' : '<div style="font-size:28px;text-align:center;margin-bottom:6px">🎮</div>';
      html += '<div class="featured-card" data-id="' + it.id + '" data-game="' + it.game_id + '" style="min-width:130px;background:#1a1d26;border-radius:12px;padding:10px;border:1px solid #2a2d36;cursor:pointer;flex-shrink:0">' + img +
        '<div style="font-size:11px;font-weight:600;color:#fff;min-height:28px;overflow:hidden">' + it.name + '</div>' +
        '<div style="font-size:12px;font-weight:800;color:#2ea6ff;margin-top:4px">' + Number(it.price).toLocaleString() + ' Ks</div>' +
        '<div style="font-size:10px;color:#8a90a0;margin-top:2px">🔥 ' + it.sold + ' sold</div></div>';
    });
    html += '</div>';
    section.innerHTML = html;
    const gamesTitle = main.querySelector('.section-title');
    if (gamesTitle && gamesTitle.parentNode) gamesTitle.parentNode.insertBefore(section, gamesTitle);
    else main.appendChild(section);
  } catch(e) {}
}

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
      }
    }
  } catch(e) {}
}
setInterval(autoRefresh, 8000);

document.querySelectorAll('[data-close]').forEach(b => {
  b.addEventListener('click', (e) => {
    const m = e.target.closest('.modal');
    if (m) { m.classList.add('hidden'); if (m.id === 'chatModal') closeChat(); }
  });
});
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', (e) => { if (e.target === m) { m.classList.add('hidden'); if (m.id === 'chatModal') closeChat(); } });
});

function showMaintenanceScreen() {
  if ($('maintenanceOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'maintenanceOverlay';
  overlay.innerHTML = '<div class="mt-bg-blob mt-blob-1"></div><div class="mt-bg-blob mt-blob-2"></div><div class="mt-content"><div class="mt-icon"><div class="mt-gear mt-gear-1">⚙️</div><div class="mt-gear mt-gear-2">⚙️</div><div class="mt-center">🛠️</div></div><h1 class="mt-title">ခဏစောင့်ပါ</h1><p class="mt-subtitle">ဆိုင်ကို ခေတ္တပြင်ဆင်နေပါသည်</p><div class="mt-progress"><div class="mt-progress-bar"></div></div><p class="mt-note">ခဏနေမှ ပြန်လာကြည့်ပေးပါ 🙏</p></div>';
  document.body.appendChild(overlay);
}

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
  element.style.animation = 'none'; void element.offsetWidth;
  element.style.animation = 'shake 0.4s ease';
  setTimeout(() => { element.style.animation = ''; }, 400);
  try { tg.HapticFeedback.notificationOccurred('error'); } catch(e) {}
}

const extraStyle = document.createElement('style');
extraStyle.textContent = '@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}';
document.head.appendChild(extraStyle);

// THEME
(function() {
  const savedTheme = localStorage.getItem('app_theme') || 'dark';
  if (savedTheme === 'light') document.body.classList.add('light');
  function updateIcon() {
    const btn = $('themeToggleBtn'); if (!btn) return;
    btn.textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
  }
  updateIcon();
  const btn = $('themeToggleBtn');
  if (btn) btn.addEventListener('click', function() {
    document.body.classList.toggle('light');
    localStorage.setItem('app_theme', document.body.classList.contains('light') ? 'light' : 'dark');
    updateIcon();
    try { tg.HapticFeedback.impactOccurred('light'); } catch(e) {}
    toast(document.body.classList.contains('light') ? '☀️ Light Mode' : '🌙 Dark Mode', 'success');
  });
})();

// SOUND TOGGLE
(function() {
  const toggle = $('soundToggle'); if (!toggle) return;
  if (window.SOUND_ENABLED) toggle.classList.add('on');
  toggle.addEventListener('click', function() {
    window.SOUND_ENABLED = !window.SOUND_ENABLED;
    toggle.classList.toggle('on', window.SOUND_ENABLED);
    localStorage.setItem('sound_enabled', window.SOUND_ENABLED ? 'true' : 'false');
    try { tg.HapticFeedback.impactOccurred('light'); } catch(e) {}
    toast(window.SOUND_ENABLED ? '🔊 အသံ ဖွင့်ပြီ' : '🔇 အသံ ပိတ်ပြီ', 'success');
  });
})();

// SPLASH
(function() {
  const splash = $('splashScreen'); if (!splash) return;
  setTimeout(function() { splash.classList.add('hide'); setTimeout(function() { splash.remove(); }, 700); }, 1800);
})();

// GLOBAL HAPTIC
(function() {
  if (!window.Telegram || !window.Telegram.WebApp || !window.Telegram.WebApp.HapticFeedback) return;
  function vibrate(type) {
    try {
      var hf = window.Telegram.WebApp.HapticFeedback;
      if (type === 'heavy') hf.impactOccurred('heavy');
      else if (type === 'medium') hf.impactOccurred('medium');
      else hf.impactOccurred('light');
    } catch(e) {}
  }
  function handleClick(e) {
    var target = e.target ? e.target.closest('button, .btn, .nav-btn, .game-card, .item-card, .dashboard-card, .pay-btn, .qa-btn, .header-btn, .modal-close, .spin-btn, .item-buy, .wish-heart, .reorder-btn, a') : null;
    if (!target) return;
    var cls = target.className || '';
    var strength = 'light';
    if (cls.indexOf('spin-btn') >= 0) strength = 'heavy';
    else if (cls.indexOf('item-buy') >= 0 || cls.indexOf('dashboard-card') >= 0 || cls.indexOf('game-card') >= 0) strength = 'medium';
    vibrate(strength);
  }
  document.addEventListener('touchstart', handleClick, { passive: true });
})();

updateWishBadge();
init();

// ==========================================
// TERMS / PRIVACY / ABOUT US
// ==========================================
const TERMS_DATA = {
  terms: {
    title: '📜 သတ်မှတ်ချက်များ',
    content:
      '<h3>၁။ အကောင့်ဖွင့်ခြင်း</h3>' +
      '<p>အသက် ၁၃ နှစ်အထက် ဖြစ်ရပါမည်။ မှန်ကန်သော အချက်အလက်များ ဖြည့်စွက်ရပါမည်။ တစ်ဦးလျှင် အကောင့် ၁ ခုသာ ဖွင့်ခွင့်ရှိသည်။</p>' +
      '<h3>၂။ ဝယ်ယူခြင်း</h3>' +
      '<p>Order တင်ပြီးနောက် Admin မှ စစ်ဆေးပြီး ဆောင်ရွက်ပါမည်။ Game ID မှားထည့်ခြင်းကြောင့် ဖြစ်ပေါ်သော ဆုံးရှုံးမှုအတွက် ကျွန်ုပ်တို့ တာဝန်မခံပါ။</p>' +
      '<h3>၃။ ငွေပြန်အမ်းခြင်း</h3>' +
      '<p>Order မဆောင်ရွက်ရသေးပါက Refund ရနိုင်သည်။ ဆောင်ရွက်ပြီးပါက Refund မရနိုင်ပါ။</p>' +
      '<h3>၄။ ပိတ်ပင်ခြင်း</h3>' +
      '<p>Rule ချိုးဖောက်ပါက အကောင့်ကို ပိတ်ပင်နိုင်သည်။ Balance များ ဆုံးရှုံးနိုင်သည်။</p>' +
      '<h3>၅။ ပြောင်းလဲမှု</h3>' +
      '<p>သတ်မှတ်ချက်များကို ကြိုတင်အသိပေးခြင်းမရှိဘဲ ပြောင်းလဲနိုင်သည်။</p>'
  },
  privacy: {
    title: '🔒 Privacy Policy',
    content:
      '<h3>၁။ ကောက်ခံသော အချက်အလက်များ</h3>' +
      '<ul><li>Telegram User ID</li><li>နာမည်</li><li>ဖုန်းနံပါတ်</li><li>Order မှတ်တမ်းများ</li></ul>' +
      '<h3>၂။ အသုံးပြုသည့် ရည်ရွယ်ချက်</h3>' +
      '<p>Order ဆောင်ရွက်ရန်၊ Customer Service ပေးရန်၊ လုံခြုံရေးအတွက် အသုံးပြုသည်။</p>' +
      '<h3>၃။ မျှဝေခြင်း</h3>' +
      '<p>သင့်အချက်အလက်များကို တတိယပါတီသို့ မျှဝေမည် မဟုတ်ပါ။ ဥပဒေအရ တောင်းခံပါက မှလွဲ၍။</p>' +
      '<h3>၄။ လုံခြုံရေး</h3>' +
      '<p>Password များကို Hash လုပ်ပြီး သိမ်းဆည်းသည်။ သင့် Password ကို ဘယ်သူ့ကိုမှ မပေးပါနှင့်။</p>' +
      '<h3>၅။ သင့်အခွင့်အရေး</h3>' +
      '<p>သင့်အချက်အလက်များကို ကြည့်ရှုရန်၊ ပြင်ဆင်ရန်၊ ဖျက်ရန် Admin ကို ဆက်သွယ်နိုင်သည်။</p>'
  }
};

window.openTermsModal = function(tab) {
  show('termsModal');
  switchTermsTab(tab || 'terms');
};

window.switchTermsTab = function(tab) {
  const data = TERMS_DATA[tab] || TERMS_DATA.terms;
  const titleEl = document.getElementById('termsTitle');
  const contentEl = document.getElementById('termsContent');
  const termsBtn = document.getElementById('termsTabBtn');
  const privBtn = document.getElementById('privacyTabBtn');
  if (titleEl) titleEl.textContent = data.title;
  if (contentEl) contentEl.innerHTML = data.content;
  if (termsBtn && privBtn) {
    termsBtn.className = 'terms-tab-btn ' + (tab === 'terms' ? 'active' : 'inactive');
    privBtn.className = 'terms-tab-btn ' + (tab === 'privacy' ? 'active' : 'inactive');
  }
};

window.openAboutModal = function() {
  show('aboutModal');
  const el = document.getElementById('aboutContent');
  if (!el) return;
  el.innerHTML =
    '<h3>🛡️ Safe Zone Game Topup</h3>' +
    '<p>မြန်မာနိုင်ငံရှိ ဂိမ်းကစားသူများအတွက် လျင်မြန်လုံခြုံသော Top-up ဝန်ဆောင်မှုကို ပေးအပ်လျက်ရှိပါသည်။</p>' +
    '<h3>🎯 ကျွန်ုပ်တို့၏ ရည်မှန်းချက်</h3>' +
    '<ul><li>⚡ လျင်မြန်သော ဝန်ဆောင်မှု (၅ မိနစ် ~ ၁ နာရီ)</li>' +
    '<li>🔒 လုံခြုံသော ငွေပေးချေမှု</li>' +
    '<li>💬 ၂၄/၇ Customer Support</li>' +
    '<li>💰 ဈေးနှုန်းသက်သာမှု</li></ul>' +
    '<h3>🏢 ဆိုင်အချက်အလက်</h3>' +
    '<ul><li><b>ဆိုင်အမည်:</b> Safe Zone Game Topup</li>' +
    '<li><b>တည်နေရာ:</b> မြန်မာနိုင်ငံ</li>' +
    '<li><b>ဝန်ဆောင်မှု:</b> MLBB, PUBG, Magic Chess, App Premium</li>' +
    '<li><b>ငွေပေးချေမှု:</b> KBZ, Wave, UAB, AYA</li></ul>' +
    '<h3>📞 ဆက်သွယ်ရန်</h3>' +
    '<ul><li><b>Telegram:</b> @pyae_phyo_12327</li>' +
    '<li><b>Chat:</b> Mini App ထဲမှ 💬 Chat</li></ul>' +
    '<h3>🕐 ဖွင့်ချိန်</h3>' +
    '<p>မနက် ၉:၀၀ ~ ည ၁၁:၀၀ (တစ်ပတ်လုံး)</p>' +
    '<p style="text-align:center;color:#8a90a0;font-size:11px;margin-top:16px">© 2026 Safe Zone Game Topup. All rights reserved.</p>';
};

console.log('✅ Terms/Privacy/About loaded');
