const tg = window.Telegram.WebApp;
tg.ready(); tg.expand();
try { tg.setHeaderColor('secondary_bg_color'); } catch(e){}

const $ = (id) => document.getElementById(id);
const initData = tg.initData || '';
let STATE = { user: null, games: [], selectedMethod: null, selectedItem: null, payments: {} };

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Init-Data': initData, ...(opts.headers||{}) };
  const res = await fetch(path, { ...opts, headers });
  return res.json();
}

function toast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.classList.remove('hidden');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.add('hidden'), 3000);
}
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

async function init() {
  try {
    const cfg = await (await fetch('/api/config')).json();
    if (!cfg.enabled) { hide('loading'); show('maintenance'); return; }
    STATE.payments = cfg.payments || {};
  } catch(e) {
    hide('loading');
    toast('Server မချိတ်နိုင်ပါ', 'error');
    return;
  }
  const me = await api('/api/me', { method: 'POST', body: '{}' });
  hide('loading');
  if (!me.user) { show('register'); }
  else {
    STATE.user = me.user;
    show('main');
    renderMain();
    loadGames();
  }
}

$('registerBtn').addEventListener('click', async () => {
  const phone = $('phoneInput').value.trim();
  if (!/^[0-9+\-\s]{6,}$/.test(phone)) return toast('ဖုန်းနံပါတ် မှန်ကန်စွာထည့်ပါ', 'error');
  const res = await api('/api/register', { method: 'POST', body: JSON.stringify({ phone }) });
  if (res.ok) {
    STATE.user = res.user;
    hide('register'); show('main');
    renderMain(); loadGames();
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    toast('အကောင့်ဖွင့်ပြီးပါပြီ 🎉', 'success');
  } else { toast(res.error || 'မအောင်မြင်ပါ', 'error'); }
});

function renderMain() {
  $('balanceVal').textContent = Number(STATE.user.balance || 0).toLocaleString();
  $('userLabel').textContent = `${STATE.user.first_name || ''} • ${STATE.user.phone || ''}`;
}
async function refreshMe() {
  const me = await api('/api/me', { method: 'POST', body: '{}' });
  if (me.user) { STATE.user = me.user; renderMain(); }
}

async function loadGames() {
  const res = await api('/api/games');
  STATE.games = res.games || [];
  const grid = $('gamesGrid');
  grid.innerHTML = '';
  STATE.games.forEach(g => {
    const div = document.createElement('div');
    div.className = 'game-card';
    const img = g.image || '';
    div.innerHTML = `<img src="${img}" alt="${g.name}" onerror="this.style.display='none'"/><div class="name">${g.name}</div>`;
    div.addEventListener('click', () => openItems(g));
    grid.appendChild(div);
  });
}

async function openItems(game) {
  $('itemsTitle').textContent = game.name;
  $('itemsList').innerHTML = '<p class="hint">ခဏစောင့်ပါ...</p>';
  show('itemsModal');
  const res = await api(`/api/items/${game.id}`);
  const items = res.items || [];
  const box = $('itemsList');
  if (!items.length) {
    box.innerHTML = '<p class="hint">Item မရှိသေးပါ။</p>';
    return;
  }
  box.innerHTML = '';
  items.forEach(it => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <div>
        <div style="font-weight:600">${it.name}</div>
        <div class="price">${it.price > 0 ? Number(it.price).toLocaleString() + ' MMK' : 'စျေးမသတ်ရသေး'}</div>
      </div>
      <button ${it.price>0?'':'disabled style="opacity:.5"'}>ဝယ်မယ်</button>`;
    row.querySelector('button').addEventListener('click', () => openBuy(it));
    box.appendChild(row);
  });
}

function openBuy(item) {
  STATE.selectedItem = item;
  $('buyItemName').textContent = item.name;
  $('buyItemPrice').textContent = Number(item.price).toLocaleString();
  $('buyGameAccount').value = '';
  hide('itemsModal');
  show('buyModal');
}

$('confirmBuy').addEventListener('click', async () => {
  const account = $('buyGameAccount').value.trim();
  if (account.length < 3) return toast('Game ID ထည့်ပါ', 'error');
  const res = await api('/api/purchase', {
    method: 'POST',
    body: JSON.stringify({ item_id: STATE.selectedItem.id, game_account: account })
  });
  if (res.ok) {
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    toast('ဝယ်ယူမှု တောင်းဆိုပြီးပါပြီ ✅', 'success');
    hide('buyModal');
    await refreshMe();
  } else { toast(res.error || 'မအောင်မြင်ပါ', 'error'); }
});

$('depositBtn').addEventListener('click', () => {
  $('depAmount').value = '';
  $('receiptInput').value = '';
  STATE.selectedMethod = null;
  document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
  hide('payInfo');
  show('depositModal');
});

document.querySelectorAll('.pay-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    STATE.selectedMethod = btn.dataset.method;
    const key = STATE.selectedMethod.toLowerCase();
    const info = STATE.payments[key] || '';
    $('payInfo').innerHTML = `
      <div><b>${btn.textContent}</b> သို့ ငွေလွှဲပါ</div>
      <div style="margin-top:6px">📱 ${info}</div>
      <div class="hint" style="margin-top:6px">ငွေလွှဲပြီးပါက ပြေစာပုံ အောက်မှာ တင်ပါ။</div>`;
    show('payInfo');
  });
});

$('submitDeposit').addEventListener('click', async () => {
  const amount = Number($('depAmount').value);
  const file = $('receiptInput').files[0];
  if (!amount || amount < 500) return toast('အနည်းဆုံး 500 MMK ဖြည့်ပါ', 'error');
  if (!STATE.selectedMethod) return toast('ငွေလွှဲနည်းလမ်း ရွေးပါ', 'error');
  if (!file) return toast('ပြေစာပုံ တင်ပါ', 'error');
  const fd = new FormData();
  fd.append('amount', amount);
  fd.append('method', STATE.selectedMethod);
  fd.append('receipt', file);
  const res = await fetch('/api/deposit', {
    method: 'POST',
    headers: { 'X-Init-Data': initData },
    body: fd
  }).then(r => r.json());
  if (res.ok) {
    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
    toast('Admin ထံ ပို့ပြီးပါပြီ။ အတည်ပြုချက် စောင့်ပါ ⏳', 'success');
    hide('depositModal');
    await refreshMe();
  } else { toast(res.error || 'မအောင်မြင်ပါ', 'error'); }
});

$('historyBtn').addEventListener('click', async () => {
  show('historyModal');
  const box = $('historyList');
  box.innerHTML = '<p class="hint">ခဏစောင့်ပါ...</p>';
  const [txs, orders, deps] = await Promise.all([
    api('/api/my-tx'), api('/api/my-orders'), api('/api/deposits')
  ]);
  let html = '<h3 style="margin:10px 0 6px">💳 Transactions</h3>';
  if ((txs.txs||[]).length) {
    html += txs.txs.map(t => `
      <div class="item-row" style="margin-bottom:6px">
        <div>${t.type}<div class="hint">${new Date(t.created_at*1000).toLocaleString()}</div></div>
        <div class="price">${t.amount>0?'+':''}${t.amount} → ${t.balance_after}</div>
      </div>`).join('');
  } else html += '<p class="hint">မရှိပါ</p>';

  html += '<h3 style="margin:16px 0 6px">📥 Deposits</h3>';
  if ((deps.deposits||[]).length) {
    html += deps.deposits.map(d => `
      <div class="item-row" style="margin-bottom:6px">
        <div>${d.method} #${d.id}<div class="hint">${new Date(d.created_at*1000).toLocaleString()}</div></div>
        <div class="price">${d.amount} <small>${d.status}</small></div>
      </div>`).join('');
  } else html += '<p class="hint">မရှိပါ</p>';

  html += '<h3 style="margin:16px 0 6px">🛒 Orders</h3>';
  if ((orders.orders||[]).length) {
    html += orders.orders.map(o => `
      <div class="item-row" style="margin-bottom:6px">
        <div>${o.item_name}<div class="hint">#${o.id} • ${o.game_id} • ${o.status}</div></div>
        <div class="price">${o.price}</div>
      </div>`).join('');
  } else html += '<p class="hint">မရှိပါ</p>';

  box.innerHTML = html;
});

document.querySelectorAll('[data-close]').forEach(b => {
  b.addEventListener('click', (e) => { e.target.closest('.modal').classList.add('hidden'); });
});
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); });
});

init();
