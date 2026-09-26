require('dotenv').config();
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');
const FAQ = require('./faq');

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_ID = String(process.env.ADMIN_ID || '');
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const ADMIN_CONTACT = process.env.ADMIN_CONTACT || '@pyae_phyo_12327';
const ADMIN_CONTACT_CLEAN = ADMIN_CONTACT.replace('@', '');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '218401';
const AUTO_REPLY_TIMEOUT = 180; // 3 minutes

if (!BOT_TOKEN) { console.error('❌ BOT_TOKEN မရှိပါ'); process.exit(1); }
if (!ADMIN_ID) { console.error('❌ ADMIN_ID မရှိပါ'); process.exit(1); }

const USE_DISK = fs.existsSync('/data');
const DATA_ROOT = USE_DISK ? '/data' : __dirname;
const DATA_DIR = path.join(DATA_ROOT, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'app.json');
const BACKUP_DIR = path.join(DATA_ROOT, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
console.log(`💾 Storage: ${USE_DISK ? 'Persistent Disk' : 'Local'}`);
console.log(`⏱ Auto Reply: ${AUTO_REPLY_TIMEOUT}s (${AUTO_REPLY_TIMEOUT/60} min)`);

function defaultDB() {
  return { users: [], games: [], items: [], deposits: [], orders: [], transactions: [], logs: [], messages: [], settings: {}, _seq: { users: 1, items: 1, deposits: 1, orders: 1, transactions: 1, logs: 1, messages: 1 } };
}
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return defaultDB();
  try { const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); if (!d.messages) d.messages = []; if (!d._seq.messages) d._seq.messages = 1; return d; }
  catch { return defaultDB(); }
}
let dbData = loadDB();
function saveDB() { const tmp = DB_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(dbData, null, 2)); fs.renameSync(tmp, DB_FILE); }
const now = () => Math.floor(Date.now() / 1000);

function fixImagePaths() {
  let changed = false;
  dbData.games.forEach(g => { if (g.image && g.image.includes('/image/') && !g.image.includes('/images/')) { g.image = g.image.replace('/image/', '/images/'); changed = true; } });
  if (changed) { console.log('✅ Fixed image paths'); saveDB(); }
}

function saveLocalBackup(reason = 'auto') {
  try {
    const data = { exported_at: new Date().toISOString(), reason, ...dbData };
    const json = JSON.stringify(data, null, 2);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup-${ts}.json`;
    fs.writeFileSync(path.join(BACKUP_DIR, filename), json);
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('backup-')).sort().reverse();
    if (files.length > 24) { files.slice(24).forEach(f => { try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch(e){} }); }
    return true;
  } catch (e) { return false; }
}

function restoreFromLocalBackup() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return false;
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('backup-')).sort().reverse();
    if (!files.length) return false;
    for (const f of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8'));
        if (!data.users || !data._seq) continue;
        dbData = data;
        if (!dbData.messages) dbData.messages = [];
        if (!dbData._seq.messages) dbData._seq.messages = 1;
        fixImagePaths();
        saveDB();
        return true;
      } catch (e) {}
    }
    return false;
  } catch (e) { return false; }
}

setInterval(() => saveLocalBackup('hourly'), 60 * 60 * 1000);

if (!dbData.games.length) {
  dbData.games = [
    { id: 'mlbb', name: 'Mobile Legends: Bang Bang', image: '/images/mlbb.png', active: 1, sort_order: 1 },
    { id: 'magic-chess', name: 'Magic Chess Go Go', image: '/images/magic-chess.png', active: 1, sort_order: 2 },
    { id: 'pubg', name: 'PUBG Mobile', image: '/images/pubg.png', active: 1, sort_order: 3 },
    { id: 'app-premium', name: 'App Premium', image: '/images/app-premium.png', active: 1, sort_order: 4 }
  ];
}
fixImagePaths();

const SEED_ITEMS = [
  { g: 'mlbb', n: 'Weekly Pass', p: 6650 }, { g: 'mlbb', n: 'Miya Twilight Pass', p: 35000 },
  { g: 'mlbb', n: '86 Diamonds', p: 5500 }, { g: 'mlbb', n: '172 Diamonds', p: 11500 },
  { g: 'mlbb', n: '257 Diamonds', p: 16300 }, { g: 'mlbb', n: '343 Diamonds', p: 21500 },
  { g: 'mlbb', n: '429 Diamonds', p: 26800 }, { g: 'mlbb', n: '514 Diamonds', p: 31800 },
  { g: 'mlbb', n: '600 Diamonds', p: 37000 }, { g: 'mlbb', n: '706 Diamonds', p: 42400 },
  { g: 'mlbb', n: '878 Diamonds', p: 53000 }, { g: 'mlbb', n: '963 Diamonds', p: 58300 },
  { g: 'mlbb', n: '1049 Diamonds', p: 63600 }, { g: 'mlbb', n: '1135 Diamonds', p: 68900 },
  { g: 'mlbb', n: '1412 Diamonds', p: 84800 }, { g: 'mlbb', n: '2195 Diamonds', p: 128000 },
  { g: 'mlbb', n: '3688 Diamonds', p: 213000 }, { g: 'mlbb', n: '5532 Diamonds', p: 319500 },
  { g: 'mlbb', n: '9288 Diamonds', p: 530000 }, { g: 'mlbb', n: 'Double 50+50', p: 4000 },
  { g: 'mlbb', n: 'Double 150+150', p: 12500 }, { g: 'mlbb', n: 'Double 250+250', p: 17500 },
  { g: 'mlbb', n: 'Double 500+500', p: 34500 },
  { g: 'magic-chess', n: 'Weekly Pass', p: 8500 }, { g: 'magic-chess', n: '50+50 (တစ်ခါသာ)', p: 4000 },
  { g: 'magic-chess', n: '150+150 (တစ်ခါသာ)', p: 11000 }, { g: 'magic-chess', n: '250+250 (တစ်ခါသာ)', p: 18500 },
  { g: 'magic-chess', n: '500+500 (တစ်ခါသာ)', p: 35700 }, { g: 'magic-chess', n: '86 Diamonds', p: 6000 },
  { g: 'magic-chess', n: '172 Diamonds', p: 11900 }, { g: 'magic-chess', n: '257 Diamonds', p: 17500 },
  { g: 'magic-chess', n: '344 Diamonds', p: 23000 }, { g: 'magic-chess', n: '516 Diamonds', p: 34000 },
  { g: 'magic-chess', n: '706 Diamonds', p: 45000 }, { g: 'magic-chess', n: '1346 Diamonds', p: 84200 },
  { g: 'magic-chess', n: '1825 Diamonds', p: 111500 }, { g: 'magic-chess', n: '2195 Diamonds', p: 138000 },
  { g: 'magic-chess', n: '3688 Diamonds', p: 220000 }, { g: 'magic-chess', n: '5532 Diamonds', p: 337500 },
  { g: 'magic-chess', n: '9288 Diamonds', p: 530000 },
  { g: 'pubg', n: '60 UC', p: 4700 }, { g: 'pubg', n: '120 UC', p: 9400 },
  { g: 'pubg', n: '180 UC', p: 13900 }, { g: 'pubg', n: '325 UC', p: 22700 },
  { g: 'pubg', n: '660 UC', p: 45300 }, { g: 'pubg', n: '780 UC', p: 52900 },
  { g: 'pubg', n: '1800 UC', p: 114000 }, { g: 'pubg', n: '3850 UC', p: 226000 },
  { g: 'pubg', n: '8100 UC', p: 440000 },
  { g: 'pubg', n: 'Growth Pack - First Purchase', p: 5950 }, { g: 'pubg', n: 'Growth Pack - Firearm Materials', p: 14000 },
  { g: 'pubg', n: 'Growth Pack - Mythic Emblem', p: 22750 }, { g: 'pubg', n: 'Elite Pass Lv1-50', p: 26000 },
  { g: 'pubg', n: 'Elite Pass Lv1-100', p: 52000 }, { g: 'pubg', n: 'Elite Pass Plus Lv1-100', p: 112500 },
  { g: 'pubg', n: 'Weekly Mythic Emblem', p: 17000 }, { g: 'pubg', n: 'Weekly Deal Pack 1', p: 6000 },
  { g: 'pubg', n: 'Weekly Deal Pack 2', p: 14500 }, { g: 'pubg', n: 'Prime 1 Month', p: 6000 },
  { g: 'pubg', n: 'Prime 3 Month', p: 15000 }, { g: 'pubg', n: 'Prime 6 Month', p: 27000 },
  { g: 'pubg', n: 'Prime 12 Month', p: 51000 }, { g: 'pubg', n: 'Prime Plus 1 Month', p: 46000 },
  { g: 'pubg', n: 'Prime Plus 3 Month', p: 126000 }, { g: 'pubg', n: 'Prime Plus 6 Month', p: 245000 },
  { g: 'pubg', n: 'Prime Plus 12 Month', p: 482000 },
  { g: 'app-premium', n: 'TG SMS Free (Unlimited)', p: 8000, c: '📱 Telegram' },
  { g: 'app-premium', n: 'Telegram Premium 1 Month', p: 19500, c: '📱 Telegram' },
  { g: 'app-premium', n: 'Telegram Premium 3 Month', p: 59000, c: '📱 Telegram' },
  { g: 'app-premium', n: 'Telegram Premium 6 Month', p: 77000, c: '📱 Telegram' },
  { g: 'app-premium', n: 'Telegram Premium 12 Month', p: 135000, c: '📱 Telegram' },
  { g: 'app-premium', n: 'Alight Motion 1 Year', p: 5000, c: '🎬 Video Editing' },
  { g: 'app-premium', n: 'Capcut Pro 1 Month (Mobile)', p: 8500, c: '🎬 Video Editing' },
  { g: 'app-premium', n: 'Capcut Pro 1 Month (PC)', p: 18000, c: '🎬 Video Editing' },
  { g: 'app-premium', n: 'Canva Lifetime', p: 6500, c: '🎨 Design' },
  { g: 'app-premium', n: 'ChatGPT Plus 1 Month (Share)', p: 28000, c: '🤖 AI Tools' },
  { g: 'app-premium', n: 'ChatGPT Plus 1 Month (Private)', p: 103000, c: '🤖 AI Tools' },
  { g: 'app-premium', n: 'Gemini 1 Month (Family)', p: 13000, c: '🤖 AI Tools' },
  { g: 'app-premium', n: 'Gemini 3 Month (Family)', p: 21000, c: '🤖 AI Tools' },
  { g: 'app-premium', n: 'Gemini 18 Month (Own Mail)', p: 385000, c: '🤖 AI Tools' }
];

(function autoSeedItems() {
  let added = 0;
  for (const it of SEED_ITEMS) {
    if (!dbData.items.find(x => x.game_id === it.g && x.name === it.n)) {
      dbData.items.push({ id: dbData._seq.items++, game_id: it.g, name: it.n, price: it.p, category: it.c || null, image: null, active: 1, sort_order: 0 });
      added++;
    }
  }
  if (added > 0) { console.log(`✅ Auto-seed: ${added} items`); saveDB(); }
})();

const defaultSettings = {
  miniapp_enabled: '1',
  payment_kbz: '09763442881 (Pyae Phyo Kyaw)',
  payment_wave: '09763442881 (Pyae Phyo Kyaw)',
  payment_uab: '09763442881 (Pyae Phyo Kyaw)',
  payment_aya: '09763442881 (Pyae Phyo Kyaw)'
};
Object.entries(defaultSettings).forEach(([k, v]) => { if (dbData.settings[k] === undefined) dbData.settings[k] = v; });
saveDB();

const H = {
  now,
  getSetting: (k, d = null) => dbData.settings[k] ?? d,
  setSetting: (k, v) => { dbData.settings[k] = String(v); saveDB(); },
  getUserByTg: (tgId) => dbData.users.find(u => String(u.telegram_id) === String(tgId)) || null,
  getUserById: (id) => dbData.users.find(u => u.id === Number(id)) || null,
  getUserByPhone: (phone) => dbData.users.find(u => u.phone === phone) || null,
  createUser: ({ telegram_id, username, first_name, phone, name, password_salt, password_hash }) => {
    const u = { id: dbData._seq.users++, telegram_id: String(telegram_id), username: username || null, first_name: first_name || null, name: name || first_name || null, phone: phone || null, password_salt: password_salt || null, password_hash: password_hash || null, balance: 0, banned: 0, session_active: false, created_at: now() };
    dbData.users.push(u); saveDB(); return u;
  },
  addBalance: (userId, amount, ref = null, note = null, type = 'adjust') => {
    const u = H.getUserById(userId); if (!u) throw new Error('User not found');
    u.balance = +(u.balance + amount).toFixed(2);
    dbData.transactions.push({ id: dbData._seq.transactions++, user_id: userId, type, amount, balance_after: u.balance, ref, note, created_at: now() });
    saveDB(); return u.balance;
  },
  listGames: () => dbData.games.filter(g => g.active).sort((a, b) => a.sort_order - b.sort_order),
  listItems: (gameId = null) => dbData.items.filter(i => i.active && (!gameId || i.game_id === gameId)).sort((a, b) => a.id - b.id),
  listAllItems: () => dbData.items.slice(),
  getItem: (id) => dbData.items.find(i => i.id === Number(id)) || null,
  addItem: ({ game_id, name, price, category = null }) => {
    const it = { id: dbData._seq.items++, game_id, name, price: Number(price), category, image: null, active: 1, sort_order: 0 };
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
  createOrder: ({ user_id, item_id, item_name, game_id, price, game_account, server_id, needs_account }) => {
    const o = { id: dbData._seq.orders++, user_id, item_id, item_name, game_id, price: Number(price), game_account, server_id: server_id || null, needs_account: !!needs_account, status: 'pending', created_at: now(), processed_at: null, note: null, admin_msg_id: null };
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
  backup: () => ({ exported_at: new Date().toISOString(), ...dbData }),
  replaceData: (newData) => { dbData = newData; if (!dbData.messages) dbData.messages = []; if (!dbData._seq.messages) dbData._seq.messages = 1; fixImagePaths(); saveDB(); }
};

function hashPassword(password, salt) { return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex'); }

const UPLOAD_DIR = path.join(DATA_ROOT, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: 8 * 1024 * 1024 } });

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

function validateInitData(initData, token) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash'); params.delete('hash');
    const dcs = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
    const sk = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    return crypto.createHmac('sha256', sk).update(dcs).digest('hex') === hash;
  } catch { return false; }
}
function parseTgUser(initData) {
  try { const p = new URLSearchParams(initData); const r = p.get('user'); return r ? JSON.parse(r) : null; } catch { return null; }
}
function auth(req, res, next) {
  const initData = req.headers['x-init-data'] || req.body?.initData;
  if (!initData || !validateInitData(initData, BOT_TOKEN)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const tgUser = parseTgUser(initData);
  if (!tgUser) return res.status(401).json({ ok: false, error: 'no user' });
  req.tgUser = tgUser; next();
}
function adminAuth(req, res, next) {
  const pwd = req.headers['x-admin-password'] || req.body?.password || req.query?.password;
  if (pwd !== ADMIN_PASSWORD) return res.status(401).json({ ok: false, error: 'unauthorized' });
  next();
}

app.get('/api/config', (req, res) => {
  res.json({ ok: true, enabled: H.getSetting('miniapp_enabled', '1') === '1', payments: { kbz: H.getSetting('payment_kbz'), wave: H.getSetting('payment_wave'), uab: H.getSetting('payment_uab'), aya: H.getSetting('payment_aya') }, adminContact: ADMIN_CONTACT });
});

app.post('/api/me', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (u && u.session_active === false) return res.json({ ok: true, user: null, enabled: H.getSetting('miniapp_enabled', '1') === '1' });
  res.json({ ok: true, user: u, enabled: H.getSetting('miniapp_enabled', '1') === '1' });
});

app.post('/api/logout', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (u) { u.session_active = false; saveDB(); }
  res.json({ ok: true });
});

app.post('/api/register', auth, (req, res) => {
  const { name, phone, password, password2 } = req.body;
  if (!name || name.trim().length < 2) return res.status(400).json({ ok: false, error: 'နာမည် ထည့်ပါ' });
  if (!phone || phone.length < 6) return res.status(400).json({ ok: false, error: 'ဖုန်းနံပါတ် မှန်ကန်စွာထည့်ပါ' });
  if (!password || password.length < 4) return res.status(400).json({ ok: false, error: 'စကားဝှက် 4 လုံး+' });
  if (password !== password2) return res.status(400).json({ ok: false, error: 'စကားဝှက် မတူပါ' });
  if (H.getUserByPhone(phone)) return res.status(400).json({ ok: false, error: 'ဖုန်းနံပါတ် ရှိပြီးသား' });
  let u = H.getUserByTg(req.tgUser.id);
  if (u) return res.status(400).json({ ok: false, error: 'Telegram အကောင့် register ပြီးသား' });
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  u = H.createUser({ telegram_id: req.tgUser.id, username: req.tgUser.username, first_name: req.tgUser.first_name, name: name.trim(), phone, password_salt: salt, password_hash: hash });
  u.session_active = true; saveDB();
  saveLocalBackup('register');
  res.json({ ok: true, user: u });
});

app.post('/api/login', auth, (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ ok: false, error: 'ဖုန်းနှင့် စကားဝှက် ထည့်ပါ' });
  const user = H.getUserByPhone(phone);
  if (!user) return res.status(400).json({ ok: false, error: 'ဖုန်းနံပါတ် မှားနေပါသည်' });
  const hash = hashPassword(password, user.password_salt || '');
  if (hash !== user.password_hash) return res.status(400).json({ ok: false, error: 'စကားဝှက် မှားနေပါသည်' });
  if (user.banned) return res.status(400).json({ ok: false, error: 'အကောင့် ပိတ်ထားပါသည်' });
  user.session_active = true; saveDB();
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
    const cap = `📥 Deposit Request #${depId}\n👤 ${u.name || u.first_name || ''}\n📱 ${u.phone}\n💵 ${amount} MMK\n🏦 ${method}`;
    try {
      const msg = await bot.telegram.sendPhoto(ADMIN_ID, { source: req.file.path }, { caption: cap, reply_markup: { inline_keyboard: [[{ text: '✅ Approve', callback_data: `dep:ok:${depId}` }, { text: '❌ Reject', callback_data: `dep:no:${depId}` }]] } });
      if (msg.photo?.length) { const fid = msg.photo[msg.photo.length - 1].file_id; const d = H.getDeposit(depId); if (d) { d.receipt_file_id = fid; saveDB(); } }
    } catch (e) {}
    res.json({ ok: true, deposit_id: depId });
  } catch (e) { res.status(500).json({ ok: false, error: 'server error' }); }
});

app.get('/api/deposits', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.json({ ok: true, deposits: [] });
  const list = H.listUserDeposits(u.id, 20).map(d => ({ id: d.id, amount: d.amount, method: d.method, status: d.status, created_at: d.created_at }));
  res.json({ ok: true, deposits: list });
});

app.post('/api/chat/send', auth, async (req, res) => {
  try {
    const u = H.getUserByTg(req.tgUser.id);
    if (!u) return res.status(400).json({ ok: false, error: 'register first' });
    const { text } = req.body;
    if (!text || text.trim().length < 1) return res.status(400).json({ ok: false, error: 'message required' });
    const msg = { id: dbData._seq.messages++, user_id: u.id, from: 'user', text: text.trim().slice(0, 2000), created_at: now(), read_by_admin: false, read_by_user: true, admin_msg_id: null };
    dbData.messages.push(msg); saveDB();
    try {
      const cap = `💬 *New Message*\n\n👤 ${u.name || u.first_name || ''} (@${u.username || '-'})\n🆔 ${u.telegram_id}\n📱 ${u.phone || '-'}\n\n━━━━━━━━━━━━━━━\n${msg.text}\n━━━━━━━━━━━━━━━\n\n💡 Reply လုပ်ပါ`;
      const sent = await bot.telegram.sendMessage(ADMIN_ID, cap, { parse_mode: 'Markdown' });
      msg.admin_msg_id = sent.message_id; saveDB();
    } catch (e) {}
    res.json({ ok: true, message: msg });
  } catch (e) { res.status(500).json({ ok: false, error: 'server error' }); }
});

app.post('/api/chat/history', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.json({ ok: true, messages: [] });
  const msgs = (dbData.messages || []).filter(m => m.user_id === u.id).slice(-100);
  let changed = false;
  msgs.forEach(m => { if (m.from === 'admin' && !m.read_by_user) { m.read_by_user = true; changed = true; } });
  if (changed) saveDB();
  res.json({ ok: true, messages: msgs });
});

app.post('/api/chat/unread', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.json({ ok: true, count: 0 });
  const count = (dbData.messages || []).filter(m => m.user_id === u.id && m.from === 'admin' && !m.read_by_user).length;
  res.json({ ok: true, count });
});

app.post('/api/purchase', auth, async (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.status(400).json({ ok: false, error: 'register first' });
  const { item_id, game_account, server_id } = req.body;
  const item = H.getItem(Number(item_id));
  if (!item || !item.active) return res.status(400).json({ ok: false, error: 'item not found' });
  if (!item.price || item.price <= 0) return res.status(400).json({ ok: false, error: 'price not set' });
  const gameId = item.game_id;
  const needsAccount = gameId === 'app-premium';
  if (!needsAccount) { if (!game_account || game_account.length < 3) return res.status(400).json({ ok: false, error: 'Game ID ထည့်ပါ' }); }
  if ((gameId === 'mlbb' || gameId === 'magic-chess')) { if (!server_id || String(server_id).length < 1) return res.status(400).json({ ok: false, error: 'Server ID ထည့်ပါ' }); }
  const fresh = H.getUserById(u.id);
  if (fresh.balance < item.price) return res.status(400).json({ ok: false, error: 'ငွေမလုံလောက်ပါ' });
  H.addBalance(u.id, -item.price, 'order', item.name, 'purchase');
  const orderId = H.createOrder({ user_id: u.id, item_id: item.id, item_name: item.name, game_id: item.game_id, price: item.price, game_account: game_account || null, server_id: server_id || null, needs_account: needsAccount });
  saveLocalBackup('order-created');

  let cap = `🛒 New Order #${orderId}\n👤 ${u.name || u.first_name || ''}\n📱 ${u.phone}\n🎮 ${item.game_id}\n📦 ${item.name}\n💵 ${item.price} MMK\n`;
  if (needsAccount) { cap += `\n⚠️ App Premium`; }
  else { cap += `🆔 ${game_account}`; if (server_id) cap += `\n🌐 Server: ${server_id}`; }
  try {
    const sent = await bot.telegram.sendMessage(ADMIN_ID, cap, { reply_markup: { inline_keyboard: [[{ text: '✅ ပို့ပြီး', callback_data: `ord:ok:${orderId}` }, { text: '❌ ပယ် (Refund)', callback_data: `ord:no:${orderId}` }]] } });
    const o = H.getOrder(orderId); if (o) { o.admin_msg_id = sent.message_id; saveDB(); }
  } catch (e) {}

  if (needsAccount) {
    try {
      const contactLink = `https://t.me/${ADMIN_CONTACT_CLEAN}`;
      const newBal = Number(H.getUserById(u.id).balance).toLocaleString();
      await bot.telegram.sendMessage(u.telegram_id, `✅ *Order #${orderId}*\n\n📦 ${item.name}\n💵 ${item.price} Ks\n💰 Balance: ${newBal} MMK\n\n━━━━━━━━━━━━━━━\n📌 Admin ကို ဆက်သွယ်ပါ 📌`, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: `👤 Admin ကို ဆက်သွယ်ရန်`, url: contactLink }]] } });
    } catch (e) {}
  }
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

// ============ ADMIN WEB API ============
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ ok: false, error: 'Password မှားနေပါသည်' });
});

app.get('/api/admin/stats', adminAuth, (req, res) => {
  const s = H.stats();
  const totalBalance = dbData.users.reduce((a, b) => a + Number(b.balance || 0), 0);
  const unreadChats = (dbData.messages || []).filter(m => m.from === 'user' && !m.read_by_admin).length;
  res.json({ ok: true, stats: s, totalBalance, unreadChats, itemsCount: dbData.items.length, enabled: H.getSetting('miniapp_enabled', '1') === '1' });
});

app.get('/api/admin/users', adminAuth, (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  let users = dbData.users.slice().reverse();
  if (q) users = users.filter(u => (u.name || '').toLowerCase().includes(q) || (u.phone || '').includes(q) || (u.username || '').toLowerCase().includes(q));
  res.json({ ok: true, users: users.slice(0, 100) });
});

app.post('/api/admin/user/balance', adminAuth, (req, res) => {
  const { user_id, amount, note } = req.body;
  const amt = Number(amount);
  if (!user_id || isNaN(amt)) return res.status(400).json({ ok: false, error: 'Invalid' });
  const newBal = H.addBalance(Number(user_id), amt, 'admin', note || 'Admin adjustment', amt > 0 ? 'admin_credit' : 'admin_debit');
  H.addLog('admin-panel', 'balance_adjust', `user#${user_id}`, `${amt} → ${newBal}`);
  saveLocalBackup('admin-adjust');
  res.json({ ok: true, newBalance: newBal });
});

app.post('/api/admin/user/ban', adminAuth, (req, res) => {
  const { user_id } = req.body;
  const u = H.getUserById(Number(user_id));
  if (!u) return res.status(400).json({ ok: false, error: 'User မတွေ့ပါ' });
  u.banned = u.banned ? 0 : 1;
  saveDB();
  H.addLog('admin-panel', u.banned ? 'ban' : 'unban', `user#${user_id}`, null);
  res.json({ ok: true, banned: !!u.banned });
});

app.get('/api/admin/deposits', adminAuth, (req, res) => {
  const status = req.query.status || 'pending';
  const list = status === 'all' ? dbData.deposits.slice().reverse().slice(0, 100) : H.listDeposits(status, 100);
  const enriched = list.map(d => {
    const u = H.getUserById(d.user_id);
    return { ...d, user_name: u?.name || u?.first_name || '-', user_phone: u?.phone || '-', user_tg: u?.telegram_id || '-' };
  });
  res.json({ ok: true, deposits: enriched });
});

app.post('/api/admin/deposit/approve', adminAuth, async (req, res) => {
  const { deposit_id } = req.body;
  const d = H.getDeposit(Number(deposit_id));
  if (!d || d.status !== 'pending') return res.status(400).json({ ok: false, error: 'Already processed' });
  const newBal = H.addBalance(d.user_id, d.amount, `dep#${d.id}`, 'Approved via web', 'deposit');
  H.updateDeposit(d.id, 'approved', 'admin-web');
  H.addLog('admin-panel', 'deposit_approve', `dep#${d.id}`, `${d.amount} MMK`);
  saveLocalBackup('deposit-approved');
  const u = H.getUserById(d.user_id);
  try { await bot.telegram.sendMessage(u.telegram_id, `✅ Deposit ${Number(d.amount).toLocaleString()} MMK အတည်ပြုပြီ။\n💰 ${Number(newBal).toLocaleString()} MMK`); } catch(e){}
  res.json({ ok: true, newBalance: newBal });
});

app.post('/api/admin/deposit/reject', adminAuth, async (req, res) => {
  const { deposit_id } = req.body;
  const d = H.getDeposit(Number(deposit_id));
  if (!d || d.status !== 'pending') return res.status(400).json({ ok: false, error: 'Already processed' });
  H.updateDeposit(d.id, 'rejected', 'admin-web');
  H.addLog('admin-panel', 'deposit_reject', `dep#${d.id}`, `${d.amount} MMK`);
  const u = H.getUserById(d.user_id);
  try { await bot.telegram.sendMessage(u.telegram_id, `❌ Deposit ပယ်လိုက်ပါသည်။`); } catch(e){}
  res.json({ ok: true });
});

app.get('/api/admin/orders', adminAuth, (req, res) => {
  const status = req.query.status || 'pending';
  const list = status === 'all' ? dbData.orders.slice().reverse().slice(0, 100) : H.listOrders(status, 100);
  const enriched = list.map(o => {
    const u = H.getUserById(o.user_id);
    return { ...o, user_name: u?.name || u?.first_name || '-', user_phone: u?.phone || '-', user_tg: u?.telegram_id || '-' };
  });
  res.json({ ok: true, orders: enriched });
});

app.post('/api/admin/order/complete', adminAuth, async (req, res) => {
  const { order_id, account_info } = req.body;
  const o = H.getOrder(Number(order_id));
  if (!o || o.status !== 'pending') return res.status(400).json({ ok: false, error: 'Already processed' });
  H.updateOrder(o.id, 'completed');
  H.addLog('admin-panel', 'order_complete', `ord#${o.id}`, o.item_name);
  const u = H.getUserById(o.user_id);
  if (account_info) {
    try { await bot.telegram.sendMessage(u.telegram_id, `🎉 Order #${o.id}\n\n📦 ${o.item_name}\n\n━━━━━━━━━━━━━━━\n${account_info}\n━━━━━━━━━━━━━━━\n\n⚠️ password ကို ချက်ချင်း ပြောင်းပါ။`); } catch(e){}
  } else {
    try { await bot.telegram.sendMessage(u.telegram_id, `✅ Order #${o.id} ပို့ပြီး`); } catch(e){}
  }
  res.json({ ok: true });
});

app.post('/api/admin/order/refund', adminAuth, async (req, res) => {
  const { order_id } = req.body;
  const o = H.getOrder(Number(order_id));
  if (!o || o.status !== 'pending') return res.status(400).json({ ok: false, error: 'Already processed' });
  H.addBalance(o.user_id, o.price, `refund#${o.id}`, 'Refund via web', 'refund');
  H.updateOrder(o.id, 'rejected');
  H.addLog('admin-panel', 'order_refund', `ord#${o.id}`, `${o.price} MMK`);
  saveLocalBackup('order-refunded');
  const u = H.getUserById(o.user_id);
  try { await bot.telegram.sendMessage(u.telegram_id, `❌ Order #${o.id} ပယ်ပြီး ${o.price} MMK ပြန်ထည့်ပါသည်။`); } catch(e){}
  res.json({ ok: true });
});

app.get('/api/admin/items', adminAuth, (req, res) => {
  res.json({ ok: true, items: dbData.items.slice(), games: dbData.games.slice() });
});

app.post('/api/admin/item/add', adminAuth, (req, res) => {
  const { game_id, name, price, category } = req.body;
  if (!game_id || !name || !price) return res.status(400).json({ ok: false, error: 'Invalid' });
  const id = H.addItem({ game_id, name, price: Number(price), category: category || null });
  H.addLog('admin-panel', 'additem', `item#${id}`, `${game_id} ${name}`);
  res.json({ ok: true, id });
});

app.post('/api/admin/item/price', adminAuth, (req, res) => {
  const { item_id, price } = req.body;
  H.setItemPrice(Number(item_id), Number(price));
  H.addLog('admin-panel', 'setprice', `item#${item_id}`, price);
  res.json({ ok: true });
});

app.post('/api/admin/item/toggle', adminAuth, (req, res) => {
  const { item_id } = req.body;
  H.toggleItem(Number(item_id));
  res.json({ ok: true });
});

app.post('/api/admin/item/delete', adminAuth, (req, res) => {
  const { item_id } = req.body;
  H.removeItem(Number(item_id));
  H.addLog('admin-panel', 'delitem', `item#${item_id}`, null);
  res.json({ ok: true });
});

app.get('/api/admin/logs', adminAuth, (req, res) => {
  res.json({ ok: true, logs: H.listLogs(100) });
});

app.post('/api/admin/toggle-miniapp', adminAuth, (req, res) => {
  const cur = H.getSetting('miniapp_enabled', '1') === '1';
  H.setSetting('miniapp_enabled', cur ? '0' : '1');
  H.addLog('admin-panel', 'toggle_miniapp', null, cur ? 'OFF' : 'ON');
  res.json({ ok: true, enabled: !cur });
});

app.post('/api/admin/backup', adminAuth, async (req, res) => {
  await sendBackupToAdmin('web-manual');
  res.json({ ok: true });
});

app.get('/api/admin/chats', adminAuth, (req, res) => {
  const msgs = (dbData.messages || []).filter(m => m.from === 'user').slice(-50).reverse();
  const enriched = msgs.map(m => {
    const u = H.getUserById(m.user_id);
    return { ...m, user_name: u?.name || u?.first_name || '-', user_phone: u?.phone || '-' };
  });
  res.json({ ok: true, messages: enriched });
});

// ============ BOT ============
const bot = new Telegraf(BOT_TOKEN);
const isAdmin = (id) => String(id) === ADMIN_ID;

bot.use(async (ctx, next) => {
  if (ctx.from && isAdmin(ctx.from.id)) H.setSetting('admin_last_seen', String(now()));
  return next();
});

bot.start(async (ctx) => {
  const u = H.getUserByTg(ctx.from.id);
  const welcome = `👋 မင်္ဂလာပါ ${ctx.from.first_name || ''}!\n\n🛍️ Safe Zone Game Topup\n\n${u ? `💰 Balance: ${Number(u.balance).toLocaleString()} MMK\n📱 Phone: ${u.phone}` : '📝 Mini App ထဲဝင်ပြီး အကောင့်ဖွင့်ပါ။'}\n\n💡 ဘာမေးချင်လဲ ရိုက်ပါ — FAQ ကနေ auto ဖြေပါမယ်။`;
  await ctx.reply(welcome, Markup.keyboard([['💰 Balance', '📜 History', '👤 အကောင့်']]).resize());
});

bot.hears('💰 Balance', async (ctx) => { const u = H.getUserByTg(ctx.from.id); if (!u) return ctx.reply('Mini App ထဲဝင်ပါ။'); ctx.reply(`💰 ${Number(u.balance).toLocaleString()} MMK\n👤 ${u.name || '-'}\n📱 ${u.phone || '-'}`); });
bot.hears('📜 History', async (ctx) => {
  const u = H.getUserByTg(ctx.from.id); if (!u) return ctx.reply('Mini App ထဲဝင်ပါ။');
  const txs = H.listUserTx(u.id, 10); if (!txs.length) return ctx.reply('မှတ်တမ်းမရှိပါ။');
  const text = txs.map(t => `${t.type === 'deposit' ? '➕' : t.type === 'purchase' ? '➖' : '•'} ${t.amount} (${t.balance_after})`).join('\n');
  ctx.reply('📜 မှတ်တမ်း:\n\n' + text);
});
bot.hears('👤 အကောင့်', async (ctx) => { const u = H.getUserByTg(ctx.from.id); if (!u) return ctx.reply('Mini App ထဲဝင်ပါ။'); ctx.reply(`👤 ${u.name || '-'}\n📱 ${u.phone || '-'}\n💰 ${Number(u.balance).toLocaleString()} MMK\n🆔 #${u.id}`); });

bot.on('message', async (ctx, next) => {
  if (!isAdmin(ctx.from.id)) return next();
  if (!ctx.message.reply_to_message) return next();
  if (ctx.message.text && ctx.message.text.startsWith('/')) return next();
  const replyId = ctx.message.reply_to_message.message_id;
  const text = ctx.message.text || ctx.message.caption || '';
  if (!text) return next();

  const order = dbData.orders.find(o => o.admin_msg_id === replyId);
  if (order) {
    const user = H.getUserById(order.user_id);
    if (!user) return ctx.reply('❌ User မတွေ့ပါ');
    try {
      await bot.telegram.sendMessage(user.telegram_id, `🎉 Order #${order.id}\n\n📦 ${order.item_name}\n💵 ${order.price} Ks\n\n━━━━━━━━━━━━━━━\n${text}\n━━━━━━━━━━━━━━━\n\n⚠️ password ကို ချက်ချင်း ပြောင်းပါ။`);
      if (order.status === 'pending') H.updateOrder(order.id, 'completed');
      await ctx.reply(`✅ ${user.name || user.first_name || ''} ဆီ ပို့ပြီး`);
    } catch (e) { ctx.reply('❌ ' + e.message); }
    return;
  }

  const chatMsg = (dbData.messages || []).find(m => m.admin_msg_id === replyId);
  if (chatMsg) {
    const userById = H.getUserById(chatMsg.user_id);
    if (!userById) return ctx.reply('❌ User မတွေ့ပါ');
    try {
      const adminMsg = { id: dbData._seq.messages++, user_id: userById.id, from: 'admin', text: text.slice(0, 2000), created_at: now(), read_by_admin: true, read_by_user: false, admin_msg_id: null };
      dbData.messages.push(adminMsg); saveDB();
      await ctx.reply(`✅ ${userById.name || userById.first_name || ''} ဆီ ပို့ပြီး (Mini App ထဲမှာပဲ မြင်ရမည်)`);
    } catch (e) { ctx.reply('❌ ' + e.message); }
    return;
  }
  return next();
});

// FAQ Bot + Auto Reply (3 minutes)
bot.on('text', async (ctx, next) => {
  if (isAdmin(ctx.from.id)) return next();
  const text = ctx.message.text || '';
  if (text.startsWith('/')) return next();
  if (ctx.message.reply_to_message) return next();

  const answer = FAQ.findAnswer(text);
  if (answer) {
    const kb = PUBLIC_URL
      ? { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🛍️ Mini App ဖွင့်', web_app: { url: PUBLIC_URL } }]] } }
      : { parse_mode: 'Markdown' };
    try { await ctx.reply(answer, kb); } catch (e) { await ctx.reply(answer); }
    return;
  }

  const lastSeen = Number(H.getSetting('admin_last_seen', '0'));
  if (now() - lastSeen > AUTO_REPLY_TIMEOUT) {
    await ctx.reply(`🤖 Admin သည် ယခုအချိန် offline ဖြစ်နေပါသည်။\n\n📩 စာ ရောက်ထားပြီးပါပြီ — Admin ပြန်ဝင်လာသည်နှင့် ပြန်ဖြေပါမည်။\n\n📞 အမြန်ဆုံး ဆက်သွယ်ရန်: @${ADMIN_CONTACT_CLEAN}`);
  }
  return next();
});

async function sendBackupToAdmin(reason = 'manual') {
  try {
    const data = H.backup();
    const json = JSON.stringify(data, null, 2);
    const stats = H.stats();
    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const caption = `💾 Backup (${reason})\n👥 Users: ${stats.users}\n💰 ${stats.totalDeposit} MMK\n📦 Items: ${dbData.items.length}`;
    await bot.telegram.sendDocument(ADMIN_ID, { source: Buffer.from(json), filename }, { caption });
  } catch (e) { console.error('Backup failed:', e.message); }
}

bot.command('admin', async (ctx) => { if (!isAdmin(ctx.from.id)) return; await sendAdminPanel(ctx); });

async function sendAdminPanel(ctx) {
  const s = H.stats();
  const enabled = H.getSetting('miniapp_enabled', '1') === '1';
  const unreadChats = (dbData.messages || []).filter(m => m.from === 'user' && !m.read_by_admin).length;
  const text = `🛠️ *Admin Panel*\n\n👥 Users: ${s.users}\n📥 Deposits: ${s.pendingDeposits}\n🛒 Orders: ${s.pendingOrders}\n💬 Chats: ${unreadChats}\n💰 Total: ${s.totalDeposit} MMK\n📦 Items: ${dbData.items.length}\n🔌 App: ${enabled ? '✅' : '❌'}\n\n⏱ Auto Reply: ${AUTO_REPLY_TIMEOUT}s\n🌐 Web: /admin.html`;
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback(`📥 Deposits (${s.pendingDeposits})`, 'adm:deposits')],
    [Markup.button.callback(`🛒 Orders (${s.pendingOrders})`, 'adm:orders')],
    [Markup.button.callback(`💬 Chats (${unreadChats})`, 'adm:chats')],
    [Markup.button.callback('👥 Users', 'adm:users'), Markup.button.callback('🧾 Items', 'adm:items')],
    [Markup.button.callback('📊 Stats', 'adm:stats'), Markup.button.callback('📜 Logs', 'adm:logs')],
    [Markup.button.callback(enabled ? '🔴 ပိတ်' : '🟢 ဖွင့်', 'adm:toggle')],
    [Markup.button.callback('💾 Backup', 'adm:backup')]
  ]);
  if (ctx.callbackQuery) { try { await ctx.editMessageText(text, { parse_mode: 'Markdown', ...kb }); } catch { await ctx.reply(text, { parse_mode: 'Markdown', ...kb }); } }
  else { await ctx.reply(text, { parse_mode: 'Markdown', ...kb }); }
}

bot.action('adm:panel', async (ctx) => { ctx.answerCbQuery(); await sendAdminPanel(ctx); });
bot.action('adm:toggle', async (ctx) => { if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌'); const cur = H.getSetting('miniapp_enabled', '1') === '1'; H.setSetting('miniapp_enabled', cur ? '0' : '1'); await ctx.answerCbQuery(cur ? 'ပိတ်ပြီ' : 'ဖွင့်ပြီ'); await sendAdminPanel(ctx); });
bot.action('adm:stats', async (ctx) => { if (!isAdmin(ctx.from.id)) return; const s = H.stats(); await ctx.answerCbQuery(); await ctx.reply(`📊 Users: ${s.users}\n📥 ${s.pendingDeposits}\n🛒 ${s.pendingOrders}\n💰 ${s.totalDeposit} MMK\n📦 ${dbData.items.length}`); });
bot.action('adm:logs', async (ctx) => { if (!isAdmin(ctx.from.id)) return; const logs = H.listLogs(30); await ctx.answerCbQuery(); if (!logs.length) return ctx.reply('Log မရှိပါ။'); await ctx.reply('📜\n\n' + logs.map(l => `[${new Date(l.created_at*1000).toLocaleString()}] ${l.action}`).join('\n')); });
bot.action('adm:chats', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.answerCbQuery();
  const msgs = (dbData.messages || []).filter(m => m.from === 'user').slice(-20).reverse();
  if (!msgs.length) return ctx.reply('💬 Chat မရှိပါ။');
  for (const m of msgs) {
    const u = H.getUserById(m.user_id); if (!u) continue;
    const cap = `💬 #${m.id}\n👤 ${u.name || ''}\n🆔 ${u.telegram_id}\n\n━━━━━━━━━━━━━━━\n${m.text}\n━━━━━━━━━━━━━━━\n\n💡 Reply လုပ်ပါ`;
    try { const sent = await bot.telegram.sendMessage(ctx.from.id, cap); const o = dbData.messages.find(x => x.id === m.id); if (o) { o.admin_msg_id = sent.message_id; saveDB(); } } catch (e) {}
  }
});
bot.action('adm:deposits', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const list = H.listDeposits('pending', 20);
  await ctx.answerCbQuery();
  if (!list.length) return ctx.reply('📥 မရှိပါ။');
  for (const d of list) {
    const u = H.getUserById(d.user_id);
    const cap = `📥 Deposit #${d.id}\n👤 ${u?.name || ''}\n📱 ${u?.phone || ''}\n💵 ${d.amount} MMK\n🏦 ${d.method}`;
    const kb = Markup.inlineKeyboard([[Markup.button.callback('✅', `dep:ok:${d.id}`), Markup.button.callback('❌', `dep:no:${d.id}`)]]);
    try { if (d.receipt_file_id) await ctx.telegram.sendPhoto(ctx.from.id, d.receipt_file_id, { caption: cap, ...kb }); else if (d.receipt_local && fs.existsSync(d.receipt_local)) await ctx.telegram.sendPhoto(ctx.from.id, { source: d.receipt_local }, { caption: cap, ...kb }); else await ctx.reply(cap, kb); } catch (e) { await ctx.reply(cap, kb); }
  }
});
bot.action(/^dep:ok:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  const id = Number(ctx.match[1]); const d = H.getDeposit(id);
  if (!d || d.status !== 'pending') return ctx.answerCbQuery('Already');
  const newBal = H.addBalance(d.user_id, d.amount, `dep#${d.id}`, 'Approved', 'deposit');
  H.updateDeposit(d.id, 'approved', String(ctx.from.id));
  saveLocalBackup('deposit-approved');
  await ctx.answerCbQuery('✅');
  const u = H.getUserById(d.user_id);
  try { await ctx.telegram.sendMessage(u.telegram_id, `✅ Deposit ${Number(d.amount).toLocaleString()} MMK အတည်ပြုပြီ။\n💰 ${Number(newBal).toLocaleString()} MMK`); } catch {}
  await ctx.editMessageCaption(`✅ APPROVED #${d.id}`).catch(()=>{});
  await ctx.editMessageReplyMarkup(undefined).catch(()=>{});
});
bot.action(/^dep:no:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  const id = Number(ctx.match[1]); const d = H.getDeposit(id);
  if (!d || d.status !== 'pending') return ctx.answerCbQuery('Already');
  H.updateDeposit(d.id, 'rejected', String(ctx.from.id));
  await ctx.answerCbQuery('❌');
  const u = H.getUserById(d.user_id);
  try { await ctx.telegram.sendMessage(u.telegram_id, `❌ Deposit ပယ်လိုက်ပါသည်။`); } catch {}
  await ctx.editMessageCaption(`❌ REJECTED #${d.id}`).catch(()=>{});
  await ctx.editMessageReplyMarkup(undefined).catch(()=>{});
});
bot.action('adm:orders', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const list = H.listOrders('pending', 20);
  await ctx.answerCbQuery();
  if (!list.length) return ctx.reply('🛒 မရှိပါ။');
  for (const o of list) {
    const u = H.getUserById(o.user_id);
    let cap = `🛒 #${o.id}\n👤 ${u?.name || ''}\n📱 ${u?.phone}\n🎮 ${o.game_id}\n📦 ${o.item_name}\n💵 ${o.price} MMK\n`;
    if (o.needs_account) cap += `⚠️ App Premium`;
    else { cap += `🆔 ${o.game_account}`; if (o.server_id) cap += `\n🌐 ${o.server_id}`; }
    const kb = Markup.inlineKeyboard([[Markup.button.callback('✅', `ord:ok:${o.id}`), Markup.button.callback('❌', `ord:no:${o.id}`)]]);
    const sent = await ctx.reply(cap, kb);
    const order = H.getOrder(o.id); if (order && !order.admin_msg_id) { order.admin_msg_id = sent.message_id; saveDB(); }
  }
});
bot.action(/^ord:ok:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  const id = Number(ctx.match[1]); const o = H.getOrder(id);
  if (!o || o.status !== 'pending') return ctx.answerCbQuery('Already');
  H.updateOrder(id, 'completed');
  await ctx.answerCbQuery('✅');
  const u = H.getUserById(o.user_id);
  try { await ctx.telegram.sendMessage(u.telegram_id, `✅ Order #${o.id} ပို့ပြီး`); } catch {}
  await ctx.editMessageReplyMarkup(undefined).catch(()=>{});
});
bot.action(/^ord:no:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  const id = Number(ctx.match[1]); const o = H.getOrder(id);
  if (!o || o.status !== 'pending') return ctx.answerCbQuery('Already');
  H.addBalance(o.user_id, o.price, `refund#${o.id}`, 'Refund', 'refund');
  H.updateOrder(id, 'rejected');
  await ctx.answerCbQuery('❌ Refunded');
  const u = H.getUserById(o.user_id);
  try { await ctx.telegram.sendMessage(u.telegram_id, `❌ Order #${o.id} ပယ်ပြီး ${o.price} MMK ပြန်ထည့်ပါသည်။`); } catch {}
  await ctx.editMessageReplyMarkup(undefined).catch(()=>{});
});
bot.action('adm:users', async (ctx) => { if (!isAdmin(ctx.from.id)) return; const users = H.listAllUsers().slice(0, 30); await ctx.answerCbQuery(); if (!users.length) return ctx.reply('User မရှိပါ။'); await ctx.reply('👥\n\n' + users.map(u => `#${u.id} ${u.name || u.first_name || ''}\n📱${u.phone || '-'} | 💰${u.balance}`).join('\n\n')); });
bot.action('adm:items', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const items = H.listAllItems(); await ctx.answerCbQuery();
  if (!items.length) return ctx.reply('Item မရှိပါ။');
  const byGame = {}; items.forEach(i => { if (!byGame[i.game_id]) byGame[i.game_id] = []; byGame[i.game_id].push(i); });
  let text = `🧾 Items (${items.length})\n\n`;
  Object.entries(byGame).forEach(([g, list]) => { text += `=== ${g.toUpperCase()} (${list.length}) ===\n`; list.forEach(i => { text += `#${i.id} ${i.name} — ${i.price}\n`; }); text += '\n'; });
  const chunks = text.match(/[\s\S]{1,4000}/g) || [text];
  for (const c of chunks) await ctx.reply(c);
});
bot.command('setprice', async (ctx) => { if (!isAdmin(ctx.from.id)) return; const [, id, price] = ctx.message.text.split(/\s+/); if (!id || !price) return ctx.reply('Usage: /setprice <id> <price>'); H.setItemPrice(Number(id), Number(price)); ctx.reply(`✅ #${id} → ${price}`); });
bot.command('toggleitem', async (ctx) => { if (!isAdmin(ctx.from.id)) return; const [, id] = ctx.message.text.split(/\s+/); if (!id) return ctx.reply('Usage: /toggleitem <id>'); H.toggleItem(Number(id)); ctx.reply(`🔁 #${id}`); });
bot.command('delitem', async (ctx) => { if (!isAdmin(ctx.from.id)) return; const [, id] = ctx.message.text.split(/\s+/); if (!id) return ctx.reply('Usage: /delitem <id>'); H.removeItem(Number(id)); ctx.reply(`🗑️ #${id}`); });
bot.command('additem', async (ctx) => { if (!isAdmin(ctx.from.id)) return; const body = ctx.message.text.replace('/additem', '').trim(); const [game_id, name, price] = body.split('|').map(s => s?.trim()); if (!game_id || !name || !price) return ctx.reply('Usage: /additem mlbb|86 Diamonds|5000'); const id = H.addItem({ game_id, name, price: Number(price) }); ctx.reply(`✅ #${id}`); });

bot.command('status', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const lastSeen = Number(H.getSetting('admin_last_seen', '0'));
  const isOnline = (now() - lastSeen) < AUTO_REPLY_TIMEOUT;
  const lastSeenStr = lastSeen ? new Date(lastSeen * 1000).toLocaleString() : 'မရှိ';
  const timeLeft = Math.max(0, AUTO_REPLY_TIMEOUT - (now() - lastSeen));
  await ctx.reply(`🤖 *Admin Status*\n\n${isOnline ? '🟢 Online' : '🔴 Offline'}\n⏰ နောက်ဆုံး: ${lastSeenStr}\n\n⏱ Auto Reply ဖြစ်ဖို့: ${timeLeft > 0 ? timeLeft + ' စက္ကန့် ကျန်' : 'ပို့မည်'}\n⏱ Timeout: ${AUTO_REPLY_TIMEOUT}s (${AUTO_REPLY_TIMEOUT/60} min)`, { parse_mode: 'Markdown' });
});
bot.command('faqlist', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  let text = '📚 *FAQ Keywords*\n\n';
  FAQ.FAQ_DB.forEach((f, i) => { text += `${i + 1}. ${f.k.join(', ')}\n`; });
  await ctx.reply(text, { parse_mode: 'Markdown' });
});
bot.command('faqtest', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const args = ctx.message.text.replace('/faqtest', '').trim();
  if (!args) return ctx.reply('Usage: /faqtest ငွေဖြည့်');
  const ans = FAQ.findAnswer(args);
  await ctx.reply(ans || `❌ "${args}" FAQ မရှိပါ။`);
});

bot.action('adm:backup', async (ctx) => { if (!isAdmin(ctx.from.id)) return; await ctx.answerCbQuery('💾'); await sendBackupToAdmin('manual'); await ctx.reply('✅ Backup ပို့ပြီ'); });
bot.command('backupnow', async (ctx) => { if (!isAdmin(ctx.from.id)) return; await ctx.reply('💾 ...'); await sendBackupToAdmin('manual'); await ctx.reply('✅ Backup ပို့ပြီ'); });
bot.command('backupstatus', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const files = fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('backup-')).sort().reverse() : [];
  const s = H.stats();
  await ctx.reply(`💾 Storage: ${USE_DISK ? '/data' : 'Local'}\n📁 Files: ${files.length}\n\n👥 Users: ${s.users}\n📦 Items: ${dbData.items.length}\n🛒 Orders: ${dbData.orders.length}\n\n⏱ Auto Reply: ${AUTO_REPLY_TIMEOUT}s`);
});
bot.command('restore', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const reply = ctx.message.reply_to_message;
  if (!reply || !reply.document) return ctx.reply('⚠️ Backup JSON ကို reply လုပ်ပြီး /restore');
  try {
    const fileId = reply.document.file_id;
    const link = await bot.telegram.getFileLink(fileId);
    const res = await fetch(link.href);
    const parsed = JSON.parse(await res.text());
    if (!parsed.users || !parsed._seq) return ctx.reply('❌ Invalid');
    H.replaceData(parsed);
    saveLocalBackup('manual-restore');
    await ctx.reply(`✅ Restored\n👥 ${parsed.users.length}\n📦 ${parsed.items?.length || 0}`);
  } catch (e) { ctx.reply('❌ ' + e.message); }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  if (PUBLIC_URL) console.log(`🔵 ${PUBLIC_URL}`);
  console.log(`📦 Items: ${dbData.items.length}`);
  console.log(`⏱ Auto Reply: ${AUTO_REPLY_TIMEOUT}s`);
});

bot.launch()
  .then(async () => {
    console.log('🤖 Bot started');
    const needsRestore = !fs.existsSync(DB_FILE) || !dbData.users.length;
    if (needsRestore) {
      console.log('📥 Restoring...');
      const ok = restoreFromLocalBackup();
      if (!ok) console.log('⚠️ No backup');
    } else {
      console.log(`📊 Loaded: ${dbData.users.length} users, ${dbData.items.length} items`);
    }
    saveLocalBackup('startup');
  })
  .catch(err => console.error('Bot launch error:', err));

process.once('SIGINT', () => { saveLocalBackup('shutdown'); bot.stop('SIGINT'); });
process.once('SIGTERM', () => { saveLocalBackup('shutdown'); bot.stop('SIGTERM'); });
