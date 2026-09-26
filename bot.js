require('dotenv').config();
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');

// ============ CONFIG ============
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_ID = String(process.env.ADMIN_ID || '');
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || '';

if (!BOT_TOKEN) { console.error('❌ BOT_TOKEN မရှိပါ'); process.exit(1); }
if (!ADMIN_ID) { console.error('❌ ADMIN_ID မရှိပါ'); process.exit(1); }

// ============ DATA STORAGE ============
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'app.json');

function defaultDB() {
  return {
    users: [], games: [], items: [], deposits: [], orders: [],
    transactions: [], logs: [], settings: {},
    _seq: { users: 1, items: 1, deposits: 1, orders: 1, transactions: 1, logs: 1 }
  };
}
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return defaultDB();
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return defaultDB(); }
}
let dbData = loadDB();
function saveDB() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(dbData, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

if (!dbData.games.length) {
  dbData.games = [
    { id: 'mlbb', name: 'Mobile Legends: Bang Bang', image: '/images/mlbb.png', active: 1, sort_order: 1 },
    { id: 'pubg', name: 'PUBG Mobile', image: '/images/pubg.png', active: 1, sort_order: 2 },
    { id: 'magic-chess', name: 'Magic Chess Go Go', image: '/images/magic-chess.png', active: 1, sort_order: 3 },
    { id: 'app-premium', name: 'App Premium', image: '/images/app-premium.png', active: 1, sort_order: 4 }
  ];
}
const defaultSettings = {
  miniapp_enabled: '1',
  payment_kbz: '09763442881 (Pyae Phyo Kyaw)',
  payment_wave: '09763442881 (Pyae Phyo Kyaw)',
  payment_uab: '09763442881 (Pyae Phyo Kyaw)',
  payment_aya: '09763442881 (Pyae Phyo Kyaw)'
};
Object.entries(defaultSettings).forEach(([k, v]) => {
  if (dbData.settings[k] === undefined) dbData.settings[k] = v;
});
saveDB();

const now = () => Math.floor(Date.now() / 1000);

const H = {
  now,
  getSetting: (k, d = null) => dbData.settings[k] ?? d,
  setSetting: (k, v) => { dbData.settings[k] = String(v); saveDB(); },
  getUserByTg: (tgId) => dbData.users.find(u => String(u.telegram_id) === String(tgId)) || null,
  getUserById: (id) => dbData.users.find(u => u.id === Number(id)) || null,
  getUserByPhone: (phone) => dbData.users.find(u => u.phone === phone) || null,
  createUser: ({ telegram_id, username, first_name, phone, name, password_salt, password_hash }) => {
    const u = { id: dbData._seq.users++, telegram_id: String(telegram_id), username: username || null, first_name: first_name || null, name: name || first_name || null, phone: phone || null, password_salt: password_salt || null, password_hash: password_hash || null, balance: 0, banned: 0, created_at: now() };
    dbData.users.push(u); saveDB(); return u;
  },
  updateUserPhone: (userId, phone) => { const u = H.getUserById(userId); if (u) { u.phone = phone; saveDB(); } },
  addBalance: (userId, amount, ref = null, note = null, type = 'adjust') => {
    const u = H.getUserById(userId); if (!u) throw new Error('User not found');
    u.balance = +(u.balance + amount).toFixed(2);
    dbData.transactions.push({ id: dbData._seq.transactions++, user_id: userId, type, amount, balance_after: u.balance, ref, note, created_at: now() });
    saveDB(); return u.balance;
  },
  listGames: () => dbData.games.filter(g => g.active).sort((a, b) => a.sort_order - b.sort_order),
  listItems: (gameId = null) => dbData.items.filter(i => i.active && (!gameId || i.game_id === gameId)).sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id)),
  listAllItems: () => dbData.items.slice(),
  getItem: (id) => dbData.items.find(i => i.id === Number(id)) || null,
  addItem: ({ game_id, name, price, image = null, sort_order = 0 }) => {
    const it = { id: dbData._seq.items++, game_id, name, price: Number(price), image, active: 1, sort_order };
    dbData.items.push(it); saveDB(); return it.id;
  },
  setItemPrice: (id, price) => { const it = H.getItem(id); if (it) { it.price = Number(price); saveDB(); } },
  toggleItem: (id) => { const it = H.getItem(id); if (it) { it.active = it.active ? 0 : 1; saveDB(); } },
  removeItem: (id) => { dbData.items = dbData.items.filter(i => i.id !== Number(id)); saveDB(); },
  createDeposit: ({ user_id, amount, method, receipt_file_id, receipt_local }) => {
    const d = { id: dbData._seq.deposits++, user_id, amount: Number(amount), method, receipt_file_id: receipt_file_id || null, receipt_local: receipt_local || null, status: 'pending', created_at: now(), processed_at: null, processed_by: null, note: null };
    dbData.deposits.push(d); saveDB(); return d.id;
  },
  getDeposit: (id) => dbData.deposits.find(d => d.id === Number(id)) || null,
  listDeposits: (status = null, limit = 50) => dbData.deposits.filter(d => !status || d.status === status).slice(-limit).reverse(),
  updateDeposit: (id, status, processed_by, note = null) => { const d = H.getDeposit(id); if (d) { d.status = status; d.processed_at = now(); d.processed_by = processed_by; d.note = note; saveDB(); } },
  createOrder: ({ user_id, item_id, item_name, game_id, price, game_account }) => {
    const o = { id: dbData._seq.orders++, user_id, item_id, item_name, game_id, price: Number(price), game_account, status: 'pending', created_at: now(), processed_at: null, note: null };
    dbData.orders.push(o); saveDB(); return o.id;
  },
  getOrder: (id) => dbData.orders.find(o => o.id === Number(id)) || null,
  listOrders: (status = null, limit = 50) => dbData.orders.filter(o => !status || o.status === status).slice(-limit).reverse(),
  updateOrder: (id, status, note = null) => { const o = H.getOrder(id); if (o) { o.status = status; o.processed_at = now(); o.note = note; saveDB(); } },
  listUserOrders: (userId, limit = 20) => dbData.orders.filter(o => o.user_id === userId).slice(-limit).reverse(),
  listUserTx: (userId, limit = 20) => dbData.transactions.filter(t => t.user_id === userId).slice(-limit).reverse(),
  listUserDeposits: (userId, limit = 20) => dbData.deposits.filter(d => d.user_id === userId).slice(-limit).reverse(),
  addLog: (actor, action, target = null, details = null) => {
    dbData.logs.push({ id: dbData._seq.logs++, actor, action, target, details, created_at: now() });
    if (dbData.logs.length > 5000) dbData.logs = dbData.logs.slice(-5000);
    saveDB();
  },
  listLogs: (limit = 100) => dbData.logs.slice(-limit).reverse(),
  listAllUsers: () => dbData.users.slice().reverse(),
  stats: () => ({
    users: dbData.users.length,
    pendingDeposits: dbData.deposits.filter(d => d.status === 'pending').length,
    pendingOrders: dbData.orders.filter(o => o.status === 'pending').length,
    totalDeposit: dbData.deposits.filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0),
    totalSales: dbData.orders.reduce((s, o) => s + o.price, 0)
  }),
  backup: () => ({ exported_at: new Date().toISOString(), ...dbData })
};

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

// ============ UPLOAD ============
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: 8 * 1024 * 1024 } });

// ============ EXPRESS API ============
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

function validateInitData(initData, token) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    const dcs = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
    const sk = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    return crypto.createHmac('sha256', sk).update(dcs).digest('hex') === hash;
  } catch { return false; }
}
function parseTgUser(initData) {
  try { const p = new URLSearchParams(initData); const r = p.get('user'); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function auth(req, res, next) {
  const initData = req.headers['x-init-data'] || req.body?.initData;
  if (!initData || !validateInitData(initData, BOT_TOKEN)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const tgUser = parseTgUser(initData);
  if (!tgUser) return res.status(401).json({ ok: false, error: 'no user' });
  req.tgUser = tgUser; next();
}

app.get('/api/config', (req, res) => {
  res.json({
    ok: true,
    enabled: H.getSetting('miniapp_enabled', '1') === '1',
    payments: {
      kbz: H.getSetting('payment_kbz'), wave: H.getSetting('payment_wave'),
      uab: H.getSetting('payment_uab'), aya: H.getSetting('payment_aya')
    }
  });
});

app.post('/api/me', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  res.json({ ok: true, user: u, enabled: H.getSetting('miniapp_enabled', '1') === '1' });
});

// ============ REGISTER ============
app.post('/api/register', auth, (req, res) => {
  const { name, phone, password, password2 } = req.body;
  if (!name || name.trim().length < 2) return res.status(400).json({ ok: false, error: 'နာမည် ထည့်ပါ' });
  if (!phone || phone.length < 6) return res.status(400).json({ ok: false, error: 'ဖုန်းနံပါတ် မှန်ကန်စွာထည့်ပါ' });
  if (!password || password.length < 4) return res.status(400).json({ ok: false, error: 'စကားဝှက် အနည်းဆုံး 4 လုံး ထည့်ပါ' });
  if (password !== password2) return res.status(400).json({ ok: false, error: 'စကားဝှက် နှစ်ခု မတူညီပါ' });
  if (H.getUserByPhone(phone)) return res.status(400).json({ ok: false, error: 'ဒီဖုန်းနံပါတ်နဲ့ အကောင့်ရှိပြီးသားပါ' });

  let u = H.getUserByTg(req.tgUser.id);
  if (u) return res.status(400).json({ ok: false, error: 'ဒီ Telegram အကောင့်နဲ့ register လုပ်ပြီးသားပါ' });

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);

  u = H.createUser({
    telegram_id: req.tgUser.id,
    username: req.tgUser.username,
    first_name: req.tgUser.first_name,
    name: name.trim(),
    phone,
    password_salt: salt,
    password_hash: hash
  });

  H.addLog(req.tgUser.id, 'register', `user#${u.id}`, `${name} | ${phone}`);
  res.json({ ok: true, user: u });
});

// ============ LOGIN (phone + password) ============
app.post('/api/login', auth, (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ ok: false, error: 'ဖုန်းနံပါတ် နှင့် စကားဝှက် ထည့်ပါ' });
  const user = H.getUserByPhone(phone);
  if (!user) return res.status(400).json({ ok: false, error: 'ဖုန်းနံပါတ် မှားနေပါသည်' });
  const hash = hashPassword(password, user.password_salt || '');
  if (hash !== user.password_hash) return res.status(400).json({ ok: false, error: 'စကားဝှက် မှားနေပါသည်' });
  if (user.banned) return res.status(400).json({ ok: false, error: 'ဒီအကောင့်ကို ပိတ်ထားပါသည်' });
  H.addLog(req.tgUser.id, 'login', `user#${user.id}`, phone);
  res.json({ ok: true, user });
});

app.get('/api/games', auth, (req, res) => res.json({ ok: true, games: H.listGames() }));
app.get('/api/items/:gameId', auth, (req, res) => res.json({ ok: true, items: H.listItems(req.params.gameId) }));

app.post('/api/deposit', auth, upload.single('receipt'), async (req, res) => {
  try {
    const u = H.getUserByTg(req.tgUser.id);
    if (!u) return res.status(400).json({ ok: false, error: 'register first' });
    const amount = Number(req.body.amount);
    const method = String(req.body.method || '').toUpperCase();
    if (!amount || amount <= 0) return res.status(400).json({ ok: false, error: 'invalid amount' });
    if (!['KBZ', 'WAVE', 'UAB', 'AYA'].includes(method)) return res.status(400).json({ ok: false, error: 'invalid method' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'receipt required' });
    const depId = H.createDeposit({ user_id: u.id, amount, method, receipt_local: req.file.path });
    H.addLog(req.tgUser.id, 'deposit_request', `dep#${depId}`, `${amount} ${method}`);
    const cap = `📥 Deposit Request #${depId}\n👤 ${u.name || u.first_name || ''} (@${u.username || '-'}) [${u.telegram_id}]\n📱 ${u.phone}\n💵 ${amount} MMK\n🏦 ${method}`;
    try {
      const msg = await bot.telegram.sendPhoto(ADMIN_ID, { source: req.file.path }, {
        caption: cap,
        reply_markup: { inline_keyboard: [[
          { text: '✅ Approve', callback_data: `dep:ok:${depId}` },
          { text: '❌ Reject', callback_data: `dep:no:${depId}` }
        ]]}
      });
      if (msg.photo?.length) {
        const fid = msg.photo[msg.photo.length - 1].file_id;
        const d = H.getDeposit(depId); if (d) { d.receipt_file_id = fid; saveDB(); }
      }
    } catch (e) { console.error('send admin failed', e.message); }
    res.json({ ok: true, deposit_id: depId });
  } catch (e) { console.error(e); res.status(500).json({ ok: false, error: 'server error' }); }
});

app.get('/api/deposits', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.json({ ok: true, deposits: [] });
  const list = H.listUserDeposits(u.id, 20).map(d => ({ id: d.id, amount: d.amount, method: d.method, status: d.status, created_at: d.created_at }));
  res.json({ ok: true, deposits: list });
});

app.post('/api/purchase', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.status(400).json({ ok: false, error: 'register first' });
  const { item_id, game_account } = req.body;
  const item = H.getItem(Number(item_id));
  if (!item || !item.active) return res.status(400).json({ ok: false, error: 'item not found' });
  if (!item.price || item.price <= 0) return res.status(400).json({ ok: false, error: 'price not set' });
  if (!game_account || game_account.length < 3) return res.status(400).json({ ok: false, error: 'game id required' });
  const fresh = H.getUserById(u.id);
  if (fresh.balance < item.price) return res.status(400).json({ ok: false, error: 'insufficient balance' });
  H.addBalance(u.id, -item.price, 'order', item.name, 'purchase');
  const orderId = H.createOrder({ user_id: u.id, item_id: item.id, item_name: item.name, game_id: item.game_id, price: item.price, game_account });
  H.addLog(req.tgUser.id, 'order_create', `ord#${orderId}`, `${item.name} ${item.price}`);
  const cap = `🛒 New Order #${orderId}\n👤 ${u.name || u.first_name || ''} (@${u.username || '-'}) [${u.telegram_id}]\n🎮 ${item.game_id}\n📦 ${item.name}\n💵 ${item.price} MMK\n🆔 ${game_account}`;
  bot.telegram.sendMessage(ADMIN_ID, cap, {
    reply_markup: { inline_keyboard: [[
      { text: '✅ ပို့ပြီး', callback_data: `ord:ok:${orderId}` },
      { text: '❌ ပယ် (Refund)', callback_data: `ord:no:${orderId}` }
    ]]}
  }).catch(() => {});
  res.json({ ok: true, order_id: orderId });
});

app.get('/api/my-orders', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.json({ ok: true, orders: [] });
  res.json({ ok: true, orders: H.listUserOrders(u.id, 30) });
});

app.get('/api/my-tx', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.json({ ok: true, txs: [] });
  res.json({ ok: true, txs: H.listUserTx(u.id, 30) });
});

// ============ TELEGRAM BOT ============
const bot = new Telegraf(BOT_TOKEN);
const isAdmin = (id) => String(id) === ADMIN_ID;

bot.start(async (ctx) => {
  const u = H.getUserByTg(ctx.from.id);
  const welcome = `👋 မင်္ဂလာပါ ${ctx.from.first_name || ''}!\n\n🛍️ Safe Zone Game Topup မှ ကြိုဆိုပါတယ်။\n\n${u ? `💰 Balance: ${u.balance} MMK\n📱 Phone: ${u.phone}` : '📝 Mini App ထဲဝင်ပြီး အကောင့်ဖွင့်ပါ။'}\n\n👇 Mini App ကို အောက်ဘယ်ထောင့် Menu Button ကနေ ဖွင့်ပါ။`;
  const kb = [['💰 Balance', '📜 History', '👤 အကောင့်']];
  await ctx.reply(welcome, Markup.keyboard(kb).resize());
});

bot.hears('💰 Balance', async (ctx) => {
  const u = H.getUserByTg(ctx.from.id);
  if (!u) return ctx.reply('Mini App ထဲဝင်ပြီး အကောင့်ဖွင့်ပါ။');
  ctx.reply(`💰 Balance: ${u.balance} MMK\n👤 Name: ${u.name || '-'}\n📱 Phone: ${u.phone || '-'}`);
});

bot.hears('📜 History', async (ctx) => {
  const u = H.getUserByTg(ctx.from.id);
  if (!u) return ctx.reply('Mini App ထဲဝင်ပြီး အကောင့်ဖွင့်ပါ။');
  const txs = H.listUserTx(u.id, 10);
  if (!txs.length) return ctx.reply('မှတ်တမ်းမရှိသေးပါ။');
  const text = txs.map(t => `${t.type === 'deposit' ? '➕' : t.type === 'purchase' ? '➖' : '•'} ${t.amount} MMK (${t.balance_after})\n  ${new Date(t.created_at * 1000).toLocaleString()}`).join('\n\n');
  ctx.reply(`📜 နောက်ဆုံး မှတ်တမ်း:\n\n${text}`);
});

bot.hears('👤 အကောင့်', async (ctx) => {
  const u = H.getUserByTg(ctx.from.id);
  if (!u) return ctx.reply('Mini App ထဲဝင်ပြီး အကောင့်ဖွင့်ပါ။');
  ctx.reply(`👤 အကောင့်အချက်အလက်\n\n📛 နာမည်: ${u.name || '-'}\n📱 ဖုန်း: ${u.phone || '-'}\n💰 Balance: ${u.balance} MMK\n🆔 User ID: ${u.id}`);
});

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  await sendAdminPanel(ctx);
});

async function sendAdminPanel(ctx) {
  const s = H.stats();
  const enabled = H.getSetting('miniapp_enabled', '1') === '1';
  const text = `🛠️ *Admin Panel*\n\n👥 Users: ${s.users}\n📥 Pending Deposits: ${s.pendingDeposits}\n🛒 Pending Orders: ${s.pendingOrders}\n💰 Total Deposits: ${s.totalDeposit} MMK\n🧾 Total Sales: ${s.totalSales} MMK\n\n🔌 Mini App: ${enabled ? '✅ ON' : '❌ OFF'}`;
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback(`📥 Deposits (${s.pendingDeposits})`, 'adm:deposits')],
    [Markup.button.callback(`🛒 Orders (${s.pendingOrders})`, 'adm:orders')],
    [Markup.button.callback('👥 Users', 'adm:users'), Markup.button.callback('🧾 Items', 'adm:items')],
    [Markup.button.callback('📊 Stats', 'adm:stats'), Markup.button.callback('📜 Logs', 'adm:logs')],
    [Markup.button.callback(enabled ? '🔴 Mini App ပိတ်' : '🟢 Mini App ဖွင့်', 'adm:toggle')],
    [Markup.button.callback('💾 Backup', 'adm:backup')]
  ]);
  if (ctx.callbackQuery) {
    try { await ctx.editMessageText(text, { parse_mode: 'Markdown', ...kb }); }
    catch { await ctx.reply(text, { parse_mode: 'Markdown', ...kb }); }
  } else {
    await ctx.reply(text, { parse_mode: 'Markdown', ...kb });
  }
}

bot.action('adm:panel', async (ctx) => { ctx.answerCbQuery(); await sendAdminPanel(ctx); });

bot.action('adm:toggle', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  const cur = H.getSetting('miniapp_enabled', '1') === '1';
  H.setSetting('miniapp_enabled', cur ? '0' : '1');
  H.addLog(ctx.from.id, 'toggle_miniapp', null, cur ? 'OFF' : 'ON');
  await ctx.answerCbQuery(cur ? 'Mini App ပိတ်လိုက်ပါပြီ' : 'Mini App ဖွင့်လိုက်ပါပြီ');
  await sendAdminPanel(ctx);
});

bot.action('adm:stats', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const s = H.stats();
  await ctx.answerCbQuery();
  await ctx.reply(`📊 Stats\n\n👥 Users: ${s.users}\n📥 Pending Deposits: ${s.pendingDeposits}\n🛒 Pending Orders: ${s.pendingOrders}\n💰 Total Deposits: ${s.totalDeposit} MMK\n🧾 Total Sales: ${s.totalSales} MMK`);
});

bot.action('adm:logs', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const logs = H.listLogs(30);
  await ctx.answerCbQuery();
  if (!logs.length) return ctx.reply('Log မရှိပါ။');
  const text = logs.map(l => `[${new Date(l.created_at * 1000).toLocaleString()}] ${l.actor} → ${l.action}${l.target ? ' (' + l.target + ')' : ''}${l.details ? ' :: ' + l.details : ''}`).join('\n');
  await ctx.reply('📜 Logs:\n\n' + text);
});

bot.action('adm:deposits', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const list = H.listDeposits('pending', 20);
  await ctx.answerCbQuery();
  if (!list.length) return ctx.reply('📥 Pending deposit မရှိပါ။');
  for (const d of list) {
    const u = H.getUserById(d.user_id);
    const cap = `📥 Deposit #${d.id}\n👤 ${u?.name || u?.first_name || ''} (@${u?.username || '-'}) [${u?.telegram_id}]\n📱 ${u?.phone || '-'}\n💵 ${d.amount} MMK\n🏦 ${d.method}\n⏰ ${new Date(d.created_at * 1000).toLocaleString()}`;
    const kb = Markup.inlineKeyboard([[
      Markup.button.callback('✅ Approve', `dep:ok:${d.id}`),
      Markup.button.callback('❌ Reject', `dep:no:${d.id}`)
    ]]);
    try {
      if (d.receipt_file_id) {
        await ctx.telegram.sendPhoto(ctx.from.id, d.receipt_file_id, { caption: cap, ...kb });
      } else if (d.receipt_local && fs.existsSync(d.receipt_local)) {
        await ctx.telegram.sendPhoto(ctx.from.id, { source: d.receipt_local }, { caption: cap, ...kb });
      } else {
        await ctx.reply(cap, kb);
      }
    } catch (e) { await ctx.reply(cap + '\n(ပုံပို့မရပါ)', kb); }
  }
});

bot.action(/^dep:ok:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  const id = Number(ctx.match[1]);
  const d = H.getDeposit(id);
  if (!d || d.status !== 'pending') return ctx.answerCbQuery('Already processed');
  H.addBalance(d.user_id, d.amount, `deposit#${d.id}`, `Approved by admin`, 'deposit');
  H.updateDeposit(d.id, 'approved', String(ctx.from.id));
  H.addLog(ctx.from.id, 'deposit_approve', `dep#${d.id}`, `${d.amount} MMK`);
  await ctx.answerCbQuery('✅ Approved');
  const u = H.getUserById(d.user_id);
  try { await ctx.telegram.sendMessage(u.telegram_id, `✅ သင့် deposit ${d.amount} MMK ကို အတည်ပြုပြီးပါပြီ။\n💰 Balance အသစ်: ${u.balance + d.amount} MMK`); } catch {}
  await ctx.editMessageCaption(`✅ APPROVED — Deposit #${d.id} (${d.amount} MMK)`, { reply_markup: undefined }).catch(()=>{});
  await ctx.editMessageReplyMarkup(undefined).catch(()=>{});
});

bot.action(/^dep:no:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  const id = Number(ctx.match[1]);
  const d = H.getDeposit(id);
  if (!d || d.status !== 'pending') return ctx.answerCbQuery('Already processed');
  H.updateDeposit(d.id, 'rejected', String(ctx.from.id));
  H.addLog(ctx.from.id, 'deposit_reject', `dep#${d.id}`, `${d.amount} MMK`);
  await ctx.answerCbQuery('❌ Rejected');
  const u = H.getUserById(d.user_id);
  try { await ctx.telegram.sendMessage(u.telegram_id, `❌ သင့် deposit ${d.amount} MMK ကို ပယ်ဖျက်လိုက်ပါသည်။`); } catch {}
  await ctx.editMessageCaption(`❌ REJECTED — Deposit #${d.id} (${d.amount} MMK)`, { reply_markup: undefined }).catch(()=>{});
  await ctx.editMessageReplyMarkup(undefined).catch(()=>{});
});

bot.action('adm:orders', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const list = H.listOrders('pending', 20);
  await ctx.answerCbQuery();
  if (!list.length) return ctx.reply('🛒 Pending order မရှိပါ။');
  for (const o of list) {
    const u = H.getUserById(o.user_id);
    const cap = `🛒 Order #${o.id}\n👤 ${u?.name || u?.first_name || ''} (@${u?.username || '-'}) [${u?.telegram_id}]\n🎮 ${o.game_id}\n📦 ${o.item_name}\n💵 ${o.price} MMK\n🆔 Game ID: ${o.game_account || '-'}\n⏰ ${new Date(o.created_at * 1000).toLocaleString()}`;
    const kb = Markup.inlineKeyboard([[
      Markup.button.callback('✅ ပို့ပြီး', `ord:ok:${o.id}`),
      Markup.button.callback('❌ ပယ်', `ord:no:${o.id}`)
    ]]);
    await ctx.reply(cap, kb);
  }
});

bot.action(/^ord:ok:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  const id = Number(ctx.match[1]);
  const o = H.getOrder(id);
  if (!o || o.status !== 'pending') return ctx.answerCbQuery('Already processed');
  H.updateOrder(id, 'completed');
  H.addLog(ctx.from.id, 'order_complete', `ord#${id}`, o.item_name);
  await ctx.answerCbQuery('✅');
  const u = H.getUserById(o.user_id);
  try { await ctx.telegram.sendMessage(u.telegram_id, `✅ သင့် order #${o.id} (${o.item_name}) ကို ပို့ဆောင်ပြီးပါပြီ။`); } catch {}
  await ctx.editMessageReplyMarkup(undefined).catch(()=>{});
});

bot.action(/^ord:no:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  const id = Number(ctx.match[1]);
  const o = H.getOrder(id);
  if (!o || o.status !== 'pending') return ctx.answerCbQuery('Already processed');
  H.addBalance(o.user_id, o.price, `refund#${o.id}`, 'Order rejected refund', 'refund');
  H.updateOrder(id, 'rejected');
  H.addLog(ctx.from.id, 'order_reject', `ord#${id}`, `refund ${o.price}`);
  await ctx.answerCbQuery('❌ + Refunded');
  const u = H.getUserById(o.user_id);
  try { await ctx.telegram.sendMessage(u.telegram_id, `❌ သင့် order #${o.id} ကို ပယ်ဖျက်ပြီး ${o.price} MMK ကို wallet ထဲ ပြန်ထည့်ပေးလိုက်ပါသည်။`); } catch {}
  await ctx.editMessageReplyMarkup(undefined).catch(()=>{});
});

bot.action('adm:users', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const users = H.listAllUsers().slice(0, 30);
  await ctx.answerCbQuery();
  if (!users.length) return ctx.reply('User မရှိသေးပါ။');
  const text = users.map(u => `#${u.id} ${u.name || u.first_name || ''} (@${u.username || '-'})\n  TG:${u.telegram_id} | 📱${u.phone || '-'} | 💰${u.balance}`).join('\n\n');
  await ctx.reply('👥 Users:\n\n' + text);
});

bot.action('adm:items', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const items = H.listAllItems();
  await ctx.answerCbQuery();
  if (!items.length) return ctx.reply('Item မရှိပါ။ /additem <game_id>|<name>|<price>');
  const text = items.map(i => `#${i.id} [${i.game_id}] ${i.name} — ${i.price} MMK ${i.active ? '🟢' : '🔴'}`).join('\n');
  await ctx.reply(`🧾 Items\n\n${text}\n\nCommand:\n/setprice <id> <price>\n/toggleitem <id>\n/delitem <id>\n/additem <game_id>|<name>|<price>`);
});

bot.command('setprice', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const [, id, price] = ctx.message.text.split(/\s+/);
  if (!id || !price) return ctx.reply('Usage: /setprice <id> <price>');
  H.setItemPrice(Number(id), Number(price));
  H.addLog(ctx.from.id, 'setprice', `item#${id}`, price);
  ctx.reply(`✅ Item #${id} → ${price} MMK`);
});

bot.command('toggleitem', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const [, id] = ctx.message.text.split(/\s+/);
  if (!id) return ctx.reply('Usage: /toggleitem <id>');
  H.toggleItem(Number(id));
  ctx.reply(`🔁 Toggled item #${id}`);
});

bot.command('delitem', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const [, id] = ctx.message.text.split(/\s+/);
  if (!id) return ctx.reply('Usage: /delitem <id>');
  H.removeItem(Number(id));
  ctx.reply(`🗑️ Deleted item #${id}`);
});

bot.command('additem', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const body = ctx.message.text.replace('/additem', '').trim();
  const [game_id, name, price] = body.split('|').map(s => s?.trim());
  if (!game_id || !name || !price) return ctx.reply('Usage: /additem mlbb|86 Diamonds|5000');
  const id = H.addItem({ game_id, name, price: Number(price) });
  H.addLog(ctx.from.id, 'additem', `item#${id}`, `${game_id} ${name} ${price}`);
  ctx.reply(`✅ Item #${id} ထည့်ပြီး`);
});

bot.action('adm:backup', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const data = H.backup();
  const json = JSON.stringify(data, null, 2);
  const filename = `backup-${new Date().toISOString().slice(0,10)}.json`;
  await ctx.answerCbQuery('💾 Backup ပို့နေသည်');
  await ctx.replyWithDocument({ source: Buffer.from(json), filename });
  const dir = path.join(__dirname, 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), json);
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  if (PUBLIC_URL) console.log(`🔵 Public URL: ${PUBLIC_URL}`);
});

// ============ START BOT ============
bot.launch()
  .then(() => console.log('🤖 Bot started'))
  .catch(err => console.error('Bot launch error:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
