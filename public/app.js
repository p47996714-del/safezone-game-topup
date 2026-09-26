const tg = window.Telegram.WebApp;
tg.ready(); tg.expand();
try { tg.setHeaderColor('secondary_bg_color'); } catch(e){}

const $ = (id) => document.getElementById(id);
const initData = tg.initData || '';
let STATE = { user: null, games: [], selectedMethod: null, selectedItem: null, selectedGame: null, payments: {} };

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Init-Data': initData, ...(opts.headers||{}) };
  const res = await fetch(path, { ...opts, headers });
  return res.json();
}
function toast(msg, type = '') {
  const t = $('toast'); t.textContent = msg; t.className = 'toast ' + type; t.classList.remove('hidden');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.add('hidden'), 3000);
}
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

async function init() {
  try {
    const cfg = await (await fetch('/api/config')).json();
    if (!cfg.enabled) { hide('loading'); show('maintenance'); return; }
    STATE.payments = cfg.payments || {};
  } catch(e) { hide('loading'); toast('Server မချိတ်နိုင်ပါ', 'error'); return; }
  const me = await api('/api/me', { method: 'POST', body: '{}' });
  hide('loading');
  if (!me.user) show('login');
  else { STATE.user = me.user; show('main'); renderMain(); loadGames(); }
}

$('registerBtn').addEventListener('click', async () => {
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
    STATE.user = res.user; hide('register'); show('main'); renderMain(); loadGames();
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    toast('အကောင့်ဖွင့်ပြီးပါပြီ 🎉', 'success');
  } else toast(res.error || 'မအောင်မြင်ပါ', 'error');
});

$('loginBtn').addEventListener('click', async () => {
  const phone = $('loginPhone').value.trim();
  const password = $('loginPassword').value;
  if (!phone || !password) return toast('ဖုန်းနှင့် စကားဝှက် ထည့်ပါ', 'error');
  const res = await api('/api/login', { method: 'POST', body: JSON.stringify({ phone, password }) });
  if (res.ok) {
    STATE.user = res.user; hide('login'); show('main'); renderMain(); loadGames();
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    toast('အကောင့်ဝင်ပြီးပါပြီ ✅', 'success');
  } else toast(res.error || 'မအောင်မြင်ပါ', 'error');
});

$('showLoginBtn').addEventListener('click', () => { hide('register'); show('login'); });
$('showRegisterBtn').addEventListener('click', () => { hide('login'); show('register'); });

$('profileBtn').addEventListener('click', () => {
  const u = STATE.user; if (!u) return;
  $('profileInfo').innerHTML = `
    <div class="item-row" style="margin-bottom:8px"><div>📛 နာမည်</div><div class="price">${u.name || u.first_name || '-'}</div></div>
    <div class="item-row" style="margin-bottom:8px"><div>📱 ဖုန်း</div><div class="price">${u.phone || '-'}</div></div>
    <div class="item-row" style="margin-bottom:8px"><div>🆔 User ID</div><div class="price">#${u.id}</div></div>
    <div class="item-row" style="margin-bottom:8px"><div>💰 Balance</div><div class="price">${Number(u.balance || 0).toLocaleString()} MMK</div></div>
    <div class="item-row" style="margin-bottom:8px"><div>📅 မှတ်ပုံတင်</div><div class="price">${new Date((u.created_at||0)*1000).toLocaleDateString()}</div></div>`;
  show('profileModal');
});

$('logoutBtn').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST', body: '{}' });
  STATE.user = null; hide('profileModal'); hide('main');
  $('loginPhone').value = ''; $('loginPassword').value = '';
  $('phoneInput').value = ''; $('nameInput').value = ''; $('passwordInput').value = ''; $('passwordInput2').value = '';
  show('login'); toast('ထွက်ပြီးပါပြီ', 'success');
});

function renderMain() {
  $('balanceVal').textContent = Number(STATE.user.balance || 0).toLocaleString();
  $('userLabel').textContent = `${STATE.user.name || STATE.user.first_name || ''} • ${STATE.user.phone || ''}`;
}
async function refreshMe() {
  const me = await api('/api/me', { method: 'POST', body: '{}' });
  if (me.user) { STATE.user = me.user; renderMain(); }
}

async function loadGames() {
  const res = await api('/api/games');
  STATE.games = res.games || [];
  const grid = $('gamesGrid'); grid.innerHTML = '';
  STATE.games.forEach(g => {
    const div = document.createElement('div');
    div.className = 'game-card';
    div.innerHTML = `<img src="${g.image || ''}" alt="${g.name}" onerror="this.style.display='none'"/><div class="name">${g.name}</div>`;
    div.addEventListener('click', () => openItems(g));
    grid.appendChild(div);
  });
}

async function openItems(game) {
  STATE.selectedGame = game;
  $('itemsTitle').textContent = game.name;
  $('itemsList').innerHTML = '<p class="hint">ခဏစောင့်ပါ...</p>';
  show('itemsModal');
  const res = await api(`/api/items/${game.id}`);
  const items = res.items || [];
  const box = $('itemsList');
  if (!items.length) { box.innerHTML = '<p class="hint">Item မရှိသေးပါ။</p>'; return; }
  box.innerHTML = '';

  // App Premium ဖြစ်ရင် category အလိုက် ခွဲ
  if (game.id === 'app-premium') {
    const groups = {};
    items.forEach(it => {
      const cat = it.category || '📦 အခြား';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(it);
    });
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

function makeItemCard(it) {
  const card = document.createElement('div');
  card.className = 'item-card';
  card.innerHTML = `
    <div class="item-name">${it.name}</div>
    <div class="item-price">${it.price > 0 ? Number(it.price).toLocaleString() + ' Ks' : 'စျေးမသတ်ရသေး'}</div>
    <button ${it.price>0?'':'disabled'} class="item-buy">ဝယ်မယ်</button>`;
  card.querySelector('button').addEventListener('click', () => openBuy(it));
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

  // Field toggle
  hide('fieldServerId');
  hide('fieldNote');
  show('fieldGameId');

  if (isAppPremium) {
    hide('fieldGameId');
    show('fieldNote');
  } else if (gameId === 'mlbb' || gameId === 'magic-chess') {
    show('fieldServerId');
    $('gameIdLabel').textContent = 'Game ID';
    $('buyGameAccount').placeholder = 'Game ID ထည့်ပါ';
  } else if (gameId === 'pubg') {
    $('gameIdLabel').textContent = 'PUBG ID';
    $('buyGameAccount').placeholder = 'PUBG ID ထည့်ပါ';
  }

  hide('itemsModal'); show('buyModal');
}

$('confirmBuy').addEventListener('click', async () => {
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

  const res = await api('/api/purchase', {
    method: 'POST',
    body: JSON.stringify({ item_id: item.id, game_account: account, server_id: serverId })
  });
  if (res.ok) {
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    toast('ဝယ်ယူမှု တောင်းဆိုပြီးပါပြီ ✅', 'success');
    hide('buyModal'); await refreshMe();
  } else toast(res.error || 'မအောင်မြင်ပါ', 'error');
});

$('depositBtn').addEventListener('click', () => {
  $('depAmount').value = ''; $('receiptInput').value = '';
  STATE.selectedMethod = null;
  document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
  hide('payInfo'); show('depositModal');
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

$('submitDeposit').addEventListener('click', async () => {
  const amount = Number($('depAmount').value);
  const file = $('receiptInput').files[0];
  if (!amount || amount < 500) return toast('အနည်းဆုံး 500 MMK', 'error');
  if (!STATE.selectedMethod) return toast('နည်းလမ်း ရွေးပါ', 'error');
  if (!file) return toast('ပြေစာပုံ တင်ပါ', 'error');
  const fd = new FormData();
  fd.append('amount', amount); fd.append('method', STATE.selectedMethod); fd.append('receipt', file);
  const res = await fetch('/api/deposit', { method: 'POST', headers: { 'X-Init-Data': initData }, body: fd }).then(r => r.json());
  if (res.ok) {
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    toast('Admin ထံ ပို့ပြီးပါပြီ ⏳', 'success');
    hide('depositModal'); await refreshMe();
  } else toast(res.error || 'မအောင်မြင်ပါ', 'error');
});

$('historyBtn').addEventListener('click', async () => {
  show('historyModal');
  const box = $('historyList');
  box.innerHTML = '<p class="hint">ခဏစောင့်ပါ...</p>';
  const [txs, orders, deps] = await Promise.all([api('/api/my-tx'), api('/api/my-orders'), api('/api/deposits')]);
  let html = '<h3 style="margin:10px 0 6px">💳 Transactions</h3>';
  if ((txs.txs||[]).length) html += txs.txs.map(t => `<div class="item-row" style="margin-bottom:6px"><div>${t.type}<div class="hint">${new Date(t.created_at*1000).toLocaleString()}</div></div><div class="price">${t.amount>0?'+':''}${t.amount} → ${t.balance_after}</div></div>`).join('');
  else html += '<p class="hint">မရှိပါ</p>';
  html += '<h3 style="margin:16px 0 6px">📥 Deposits</h3>';
  if ((deps.deposits||[]).length) html += deps.deposits.map(d => `<div class="item-row" style="margin-bottom:6px"><div>${d.method} #${d.id}<div class="hint">${new Date(d.created_at*1000).toLocaleString()}</div></div><div class="price">${d.amount} <small>${d.status}</small></div></div>`).join('');
  else html += '<p class="hint">မရှိပါ</p>';
  html += '<h3 style="margin:16px 0 6px">🛒 Orders</h3>';
  if ((orders.orders||[]).length) html += orders.orders.map(o => `<div class="item-row" style="margin-bottom:6px"><div>${o.item_name}<div class="hint">#${o.id} • ${o.game_id} • ${o.status}</div></div><div class="price">${o.price}</div></div>`).join('');
  else html += '<p class="hint">မရှိပါ</p>';
  box.innerHTML = html;
});

document.querySelectorAll('[data-close]').forEach(b => {
  b.addEventListener('click', (e) => { e.target.closest('.modal').classList.add('hidden'); });
});
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); });
});

init();
