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
const AUTO_REPLY_TIMEOUT = 180;

if (!BOT_TOKEN) { console.error('❌ BOT_TOKEN မရှိပါ'); process.exit(1); }
if (!ADMIN_ID) { console.error('❌ ADMIN_ID မရှိပါ'); process.exit(1); }

const LOG = {
  ts: () => new Date().toISOString().slice(11, 19),
  ok: (...a) => console.log(`[${LOG.ts()}] ✅`, ...a),
  error: (...a) => console.error(`[${LOG.ts()}] ❌`, ...a),
  warn: (...a) => console.warn(`[${LOG.ts()}] ⚠️`, ...a)
};

const USE_DISK = fs.existsSync('/data');
const DATA_ROOT = USE_DISK ? '/data' : __dirname;
const DATA_DIR = path.join(DATA_ROOT, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'app.json');
const BACKUP_DIR = path.join(DATA_ROOT, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
const UPLOAD_DIR = path.join(DATA_ROOT, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function defaultDB() {
  return {
    users: [], games: [], items: [], deposits: [], orders: [],
    transactions: [], logs: [], messages: [], banners: [],
    promoCodes: [], stocks: [], pointsHistory: [], referrals: [], spins: [],
    admins: [],
    settings: {},
    _seq: { users: 1, items: 1, deposits: 1, orders: 1, transactions: 1, logs: 1, messages: 1, banners: 1, promoCodes: 1, stocks: 1, pointsHistory: 1, referrals: 1, spins: 1, admins: 1 }
  };
}
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return defaultDB();
  try {
    const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!d.messages) d.messages = [];
    if (!d.banners) d.banners = [];
    if (!d.promoCodes) d.promoCodes = [];
    if (!d.stocks) d.stocks = [];
    if (!d.pointsHistory) d.pointsHistory = [];
    if (!d.referrals) d.referrals = [];
    if (!d.spins) d.spins = [];
    if (!d.admins) d.admins = [];
    if (!d._seq.admins) d._seq.admins = 1;
    d.users.forEach(u => { if (u.spins_available === undefined) u.spins_available = 0; });
    return d;
  } catch { return defaultDB(); }
}
let dbData = loadDB();
function saveDB() { const tmp = DB_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(dbData, null, 2)); fs.renameSync(tmp, DB_FILE); }
const now = () => Math.floor(Date.now() / 1000);

function fixImagePaths() {
  let changed = false;
  dbData.games.forEach(g => { if (g.image && g.image.includes('/image/') && !g.image.includes('/images/')) { g.image = g.image.replace('/image/', '/images/'); changed = true; } });
  if (changed) saveDB();
}

function saveLocalBackup(reason = 'auto') {
  try {
    const data = { exported_at: new Date().toISOString(), reason, ...dbData };
    const json = JSON.stringify(data, null, 2);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    fs.writeFileSync(path.join(BACKUP_DIR, `backup-${ts}.json`), json);
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('backup-')).sort().reverse();
    if (files.length > 24) { files.slice(24).forEach(f => { try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch(e){} }); }
  } catch (e) { LOG.error('Backup failed:', e.message); }
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

if (!dbData.banners || !dbData.banners.length) {
  dbData.banners = [
    { id: 1, title: '🎉 Welcome to Safe Zone', subtitle: 'Fast & Safe Game Topup', color1: '#2ea6ff', color2: '#6a5cff', active: 1, created_at: now() },
    { id: 2, title: '💎 MLBB Diamonds', subtitle: '5000 Ks မှစ၍', color1: '#27ae60', color2: '#2ea6ff', active: 1, created_at: now() },
    { id: 3, title: '🎮 PUBG UC', subtitle: 'Instant Delivery', color1: '#f39c12', color2: '#e74c3c', active: 1, created_at: now() }
  ];
  saveDB();
}

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
  { g: 'magic-chess', n: 'Weekly Pass', p: 8500 }, { g: 'magic-chess', n: '50+50', p: 4000 },
  { g: 'magic-chess', n: '150+150', p: 11000 }, { g: 'magic-chess', n: '250+250', p: 18500 },
  { g: 'magic-chess', n: '500+500', p: 35700 }, { g: 'magic-chess', n: '86 Diamonds', p: 6000 },
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
      dbData.items.push({ id: dbData._seq.items++, game_id: it.g, name: it.n, price: it.p, category: it.c || null, image: null, active: 1, sort_order: 0, auto_delivery: 0 });
      added++;
    }
  }
  if (added > 0) LOG.ok(`Auto-seed: ${added} items`);
  saveDB();
})();

const defaultSettings = {
  miniapp_enabled: '1',
  payment_kbz: '09763442881 (Pyae Phyo Kyaw)',
  payment_wave: '09763442881 (Pyae Phyo Kyaw)',
  payment_uab: '09763442881 (Pyae Phyo Kyaw)',
  payment_aya: '09763442881 (Pyae Phyo Kyaw)',
  loyalty_enabled: '1',
  points_per_1000ks: '10',
  points_to_ks_rate: '10',
  points_min_redeem: '100',
  referral_enabled: '1',
  referral_inviter_bonus: '500',
  referral_invitee_bonus: '500',
  spin_enabled: '1',
  spin_per_purchase: '1',
  spin_rewards: '[100,200,300,500,1000,2000,5000]'
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
  getUserByRefCode: (code) => dbData.users.find(u => u.referral_code === code) || null,
  createUser: ({ telegram_id, username, first_name, phone, name, password_salt, password_hash }) => {
    const u = { id: dbData._seq.users++, telegram_id: String(telegram_id), username: username || null, first_name: first_name || null, name: name || first_name || null, phone: phone || null, password_salt: password_salt || null, password_hash: password_hash || null, balance: 0, points: 0, spins_available: 0, banned: 0, session_active: false, referral_code: null, referred_by: null, created_at: now() };
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
  addItem: ({ game_id, name, price, category = null, auto_delivery = 0 }) => {
    const it = { id: dbData._seq.items++, game_id, name, price: Number(price), category, image: null, active: 1, sort_order: 0, auto_delivery: auto_delivery ? 1 : 0 };
    dbData.items.push(it); saveDB(); return it.id;
  },
  setItemPrice: (id, price) => { const it = H.getItem(id); if (it) { it.price = Number(price); saveDB(); } },
  toggleItem: (id) => { const it = H.getItem(id); if (it) { it.active = it.active ? 0 : 1; saveDB(); } },
  toggleAutoDelivery: (id) => { const it = H.getItem(id); if (it) { it.auto_delivery = it.auto_delivery ? 0 : 1; saveDB(); return it.auto_delivery; } return 0; },
  removeItem: (id) => { dbData.items = dbData.items.filter(i => i.id !== Number(id)); saveDB(); },
  createDeposit: ({ user_id, amount, method, receipt_file_id, receipt_local }) => { const d = { id: dbData._seq.deposits++, user_id, amount: Number(amount), method, receipt_file_id: receipt_file_id || null, receipt_local: receipt_local || null, status: 'pending', created_at: now(), processed_at: null, processed_by: null, note: null }; dbData.deposits.push(d); saveDB(); return d.id; },
  getDeposit: (id) => dbData.deposits.find(d => d.id === Number(id)) || null,
  listDeposits: (status = null, limit = 50) => dbData.deposits.filter(d => !status || d.status === status).slice(-limit).reverse(),
  updateDeposit: (id, status, processed_by, note = null) => { const d = H.getDeposit(id); if (d) { d.status = status; d.processed_at = now(); d.processed_by = processed_by; d.note = note; saveDB(); } },
  createOrder: ({ user_id, item_id, item_name, game_id, price, game_account, server_id, needs_account }) => { const o = { id: dbData._seq.orders++, user_id, item_id, item_name, game_id, price: Number(price), game_account, server_id: server_id || null, needs_account: !!needs_account, status: 'pending', created_at: now(), processed_at: null, note: null, admin_msg_id: null }; dbData.orders.push(o); saveDB(); return o.id; },
  getOrder: (id) => dbData.orders.find(o => o.id === Number(id)) || null,
  listOrders: (status = null, limit = 50) => dbData.orders.filter(o => !status || o.status === status).slice(-limit).reverse(),
  updateOrder: (id, status, note = null) => { const o = H.getOrder(id); if (o) { o.status = status; o.processed_at = now(); o.note = note; saveDB(); } },
  listUserOrders: (userId, limit = 20) => dbData.orders.filter(o => o.user_id === userId).slice(-limit).reverse(),
  listUserTx: (userId, limit = 20) => dbData.transactions.filter(t => t.user_id === userId).slice(-limit).reverse(),
  listUserDeposits: (userId, limit = 20) => dbData.deposits.filter(d => d.user_id === userId).slice(-limit).reverse(),
  listAllBanners: () => dbData.banners.slice().reverse(),
  getBanner: (id) => dbData.banners.find(b => b.id === Number(id)) || null,
  addBanner: ({ title, subtitle, color1, color2 }) => { const b = { id: dbData._seq.banners++, title, subtitle, color1: color1 || '#2ea6ff', color2: color2 || '#6a5cff', active: 1, created_at: now() }; dbData.banners.push(b); saveDB(); return b.id; },
  toggleBanner: (id) => { const b = H.getBanner(id); if (b) { b.active = b.active ? 0 : 1; saveDB(); } },
  removeBanner: (id) => { dbData.banners = dbData.banners.filter(b => b.id !== Number(id)); saveDB(); },
  addLog: (actor, action, target = null, details = null) => { dbData.logs.push({ id: dbData._seq.logs++, actor, action, target, details, created_at: now() }); if (dbData.logs.length > 5000) dbData.logs = dbData.logs.slice(-5000); saveDB(); },
  listLogs: (limit = 100) => dbData.logs.slice(-limit).reverse(),
  listAllUsers: () => dbData.users.slice().reverse(),
  stats: () => ({ users: dbData.users.length, pendingDeposits: dbData.deposits.filter(d => d.status === 'pending').length, pendingOrders: dbData.orders.filter(o => o.status === 'pending').length, totalDeposit: dbData.deposits.filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0), totalSales: dbData.orders.reduce((s, o) => s + o.price, 0) }),
  backup: () => ({ exported_at: new Date().toISOString(), ...dbData }),
  getUserPoints: (userId) => { const u = H.getUserById(userId); return u ? Number(u.points || 0) : 0; },
  addPoints: (userId, points, reason, ref = null) => {
    const u = H.getUserById(userId); if (!u) return 0;
    u.points = Number(u.points || 0) + Number(points);
    dbData.pointsHistory.push({ id: dbData._seq.pointsHistory++, user_id: userId, points: Number(points), reason, ref, balance_after: u.points, created_at: now() });
    if (dbData.pointsHistory.length > 10000) dbData.pointsHistory = dbData.pointsHistory.slice(-10000);
    saveDB(); return u.points;
  },
  redeemPoints: (userId, points) => {
    const u = H.getUserById(userId); if (!u) return { ok: false, error: 'User not found' };
    const rate = Number(H.getSetting('points_to_ks_rate', '10'));
    const minRedeem = Number(H.getSetting('points_min_redeem', '100'));
    const userPoints = Number(u.points || 0);
    if (points < minRedeem) return { ok: false, error: `အနည်းဆုံး ${minRedeem} Points လိုပါသည်` };
    if (points > userPoints) return { ok: false, error: 'Point မလုံလောက်ပါ' };
    const ksValue = points * rate;
    u.points = userPoints - points;
    H.addBalance(userId, ksValue, `point#${points}`, 'Point Redeem', 'point_redeem');
    dbData.pointsHistory.push({ id: dbData._seq.pointsHistory++, user_id: userId, points: -points, reason: 'redeem', ref: `+${ksValue} Ks`, balance_after: u.points, created_at: now() });
    saveDB();
    return { ok: true, ksValue, newPoints: u.points };
  },
  listUserPoints: (userId, limit = 30) => dbData.pointsHistory.filter(p => p.user_id === userId).slice(-limit).reverse(),
  generateReferralCode: (userId) => {
    const u = H.getUserById(userId); if (!u) return null;
    if (u.referral_code) return u.referral_code;
    const code = 'REF' + String(userId).padStart(4, '0') + Math.random().toString(36).substring(2, 5).toUpperCase();
    u.referral_code = code; saveDB(); return code;
  },
  getReferralStats: (userId) => {
    const refs = dbData.referrals.filter(r => r.referrer_id === userId);
    const earned = refs.reduce((s, r) => s + Number(r.bonus || 0), 0);
    return { count: refs.length, earned };
  },
  processReferral: (newUserId, refCode) => {
    if (!refCode) return { ok: false };
    if (H.getSetting('referral_enabled', '1') !== '1') return { ok: false };
    const referrer = H.getUserByRefCode(refCode);
    if (!referrer) return { ok: false, error: 'Referral Code မမှန်ပါ' };
    if (referrer.id === newUserId) return { ok: false, error: 'ကိုယ့်ကိုယ်ကို ဖိတ်ခေါ်လို့မရပါ' };
    const already = dbData.referrals.find(r => r.referred_id === newUserId);
    if (already) return { ok: false, error: 'ဖိတ်ခေါ်ပြီးသား' };
    const inviterBonus = Number(H.getSetting('referral_inviter_bonus', '500'));
    const inviteeBonus = Number(H.getSetting('referral_invitee_bonus', '500'));
    dbData.referrals.push({ id: dbData._seq.referrals++, referrer_id: referrer.id, referred_id: newUserId, bonus: inviterBonus, created_at: now() });
    H.addBalance(referrer.id, inviterBonus, `ref#${newUserId}`, 'Referral Bonus', 'referral');
    H.addBalance(newUserId, inviteeBonus, `ref#${referrer.id}`, 'Welcome Bonus', 'referral');
    const nu = H.getUserById(newUserId); if (nu) nu.referred_by = referrer.id;
    saveDB();
    return { ok: true, inviterBonus, inviteeBonus };
  },
  listReferrals: (limit = 100) => dbData.referrals.slice(-limit).reverse(),
  listPromoCodes: () => dbData.promoCodes.slice().reverse(),
  getPromoCode: (id) => dbData.promoCodes.find(p => p.id === Number(id)) || null,
  getPromoByCode: (code) => dbData.promoCodes.find(p => p.code.toUpperCase() === String(code).toUpperCase().trim()) || null,
  addPromoCode: ({ code, type, value, max_uses, expires_at, min_purchase }) => {
    const p = { id: dbData._seq.promoCodes++, code: code.toUpperCase().trim(), type, value: Number(value), min_purchase: Number(min_purchase) || 0, max_uses: Number(max_uses) || 0, used_count: 0, used_by: [], expires_at: expires_at || null, active: 1, created_at: now() };
    dbData.promoCodes.push(p); saveDB(); return p.id;
  },
  togglePromoCode: (id) => { const p = H.getPromoCode(id); if (p) { p.active = p.active ? 0 : 1; saveDB(); } },
  removePromoCode: (id) => { dbData.promoCodes = dbData.promoCodes.filter(p => p.id !== Number(id)); saveDB(); },
  usePromoCode: (code, userId) => {
    const p = H.getPromoByCode(code);
    if (!p) return { ok: false, error: 'Promo Code မှားနေပါသည်' };
    if (!p.active) return { ok: false, error: 'Promo Code ပိတ်ထားပါသည်' };
    if (p.expires_at && now() > p.expires_at) return { ok: false, error: 'သက်တမ်းကုန်သွားပါပြီ' };
    if (p.max_uses > 0 && p.used_count >= p.max_uses) return { ok: false, error: 'အသုံးပြုနိုင်တဲ့ အရေအတွက် ကုန်သွားပါပြီ' };
    if (p.used_by.includes(userId)) return { ok: false, error: 'သင်အသုံးပြုပြီးသားပါ' };
    let bonus = 0;
    if (p.type === 'fixed') bonus = p.value;
    else if (p.type === 'percent') { const u = H.getUserById(userId); if (!u) return { ok: false, error: 'User not found' }; bonus = Math.round((u.balance || 0) * p.value / 100); if (bonus < 100) bonus = p.value; }
    if (bonus <= 0) return { ok: false, error: 'Bonus ပမာဏ မမှန်ပါ' };
    p.used_count++; p.used_by.push(userId);
    H.addBalance(userId, bonus, `promo#${p.id}`, `Promo: ${p.code}`, 'promo');
    saveDB();
    return { ok: true, bonus, code: p.code };
  },
  getAvailableSpins: (userId) => { const u = H.getUserById(userId); return u ? Number(u.spins_available || 0) : 0; },
  addSpin: (userId, count = 1) => {
    const u = H.getUserById(userId); if (!u) return 0;
    u.spins_available = Number(u.spins_available || 0) + Number(count);
    saveDB(); return u.spins_available;
  },
  canSpin: (userId) => {
    if (H.getSetting('spin_enabled', '1') !== '1') return { ok: false, error: 'Spin ပိတ်ထားပါသည်' };
    const avail = H.getAvailableSpins(userId);
    if (avail <= 0) return { ok: false, error: 'Spin အခွင့်အရေး မရှိပါ။ တစ်ခုခုဝယ်ပြီး Spin ရယူပါ။' };
    return { ok: true };
  },
  performSpin: (userId) => {
    const canSpinResult = H.canSpin(userId);
    if (!canSpinResult.ok) return canSpinResult;
    const u = H.getUserById(userId);
    u.spins_available = Math.max(0, Number(u.spins_available || 0) - 1);
    let rewards = [];
    try { rewards = JSON.parse(H.getSetting('spin_rewards', '[100,200,300,500,1000,2000,5000]')); } catch {}
    if (!rewards.length) rewards = [100, 200, 300, 500, 1000, 2000, 5000];
    const reward = rewards[Math.floor(Math.random() * rewards.length)];
    H.addBalance(userId, reward, 'spin', 'Lucky Spin Reward', 'spin_reward');
    dbData.spins.push({ id: dbData._seq.spins++, user_id: userId, reward, created_at: now() });
    saveDB();
    return { ok: true, reward, remaining: u.spins_available };
  },
  listSpins: (limit = 100) => dbData.spins.slice(-limit).reverse(),
  getAvailableStock: (itemId) => dbData.stocks.find(s => s.item_id === Number(itemId) && s.status === 'available') || null,
  getStockCount: (itemId) => dbData.stocks.filter(s => s.item_id === Number(itemId) && s.status === 'available').length,
  markStockAsSold: (stockId, userId) => {
    const stock = dbData.stocks.find(s => s.id === Number(stockId));
    if (!stock) return null;
    stock.status = 'sold'; stock.sold_to = userId; stock.sold_at = now();
    saveDB(); return stock.content;
  },
  addStock: (itemId, content) => {
    const stock = { id: dbData._seq.stocks++, item_id: Number(itemId), content: String(content).trim(), status: 'available', sold_to: null, sold_at: null, added_at: now() };
    dbData.stocks.push(stock); saveDB(); return stock.id;
  },
  removeStock: (stockId) => { dbData.stocks = dbData.stocks.filter(s => s.id !== Number(stockId)); saveDB(); },
  listStocks: (itemId) => dbData.stocks.filter(s => s.item_id === Number(itemId)),

  // ===== ADMIN ACCOUNTS =====
  listAdmins: () => dbData.admins.slice(),
  getAdminByUsername: (username) => dbData.admins.find(a => a.username === String(username).toLowerCase().trim()) || null,
  getAdminById: (id) => dbData.admins.find(a => a.id === Number(id)) || null,
  createAdmin: ({ username, name, password, role }) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const a = { id: dbData._seq.admins++, username: String(username).toLowerCase().trim(), name: name || username, password_salt: salt, password_hash: hash, role: role || 'full', active: 1, created_at: now() };
    dbData.admins.push(a); saveDB(); return a;
  },
  verifyAdminPassword: (admin, password) => {
    if (!admin || !admin.password_salt) return false;
    const hash = crypto.pbkdf2Sync(password, admin.password_salt, 100000, 64, 'sha512').toString('hex');
    return hash === admin.password_hash;
  },
  changeAdminPassword: (id, newPassword) => {
    const a = H.getAdminById(id);
    if (!a) return false;
    const salt = crypto.randomBytes(16).toString('hex');
    a.password_salt = salt;
    a.password_hash = crypto.pbkdf2Sync(newPassword, salt, 100000, 64, 'sha512').toString('hex');
    saveDB(); return true;
  },
  toggleAdminActive: (id) => { const a = H.getAdminById(id); if (a) { a.active = a.active ? 0 : 1; saveDB(); return a.active; } return 0; },
  removeAdmin: (id) => { dbData.admins = dbData.admins.filter(a => a.id !== Number(id)); saveDB(); }
};

function hashPassword(password, salt) { return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex'); }
const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: 8 * 1024 * 1024 } });

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

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
  const username = String(req.headers['x-admin-username'] || '').toLowerCase().trim();
  if (pwd === ADMIN_PASSWORD && (!username || username === 'admin')) {
    req.adminName = 'admin'; req.adminRole = 'full';
    H.setSetting('admin_last_seen', String(now()));
    return next();
  }
  if (username) {
    const admin = H.getAdminByUsername(username);
    if (admin && admin.active && H.verifyAdminPassword(admin, pwd)) {
      req.adminName = admin.username; req.adminRole = admin.role;
      H.setSetting('admin_last_seen', String(now()));
      return next();
    }
  }
  return res.status(401).json({ ok: false, error: 'unauthorized' });
}

app.get('/health', (req, res) => res.json({ ok: true, status: 'healthy', users: dbData.users.length }));
app.get('/ping', (req, res) => res.send('pong'));

// ============ CUSTOMER APIs ============
app.get('/api/config', (req, res) => {
  res.json({
    ok: true,
    enabled: H.getSetting('miniapp_enabled', '1') === '1',
    payments: { kbz: H.getSetting('payment_kbz'), wave: H.getSetting('payment_wave'), uab: H.getSetting('payment_uab'), aya: H.getSetting('payment_aya') },
    adminContact: ADMIN_CONTACT,
    features: {
      loyalty: H.getSetting('loyalty_enabled', '1') === '1',
      referral: H.getSetting('referral_enabled', '1') === '1',
      spin: H.getSetting('spin_enabled', '1') === '1',
      spinPerPurchase: Number(H.getSetting('spin_per_purchase', '1'))
    }
  });
});

app.post('/api/me', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (u && u.session_active === false) return res.json({ ok: true, user: null, enabled: H.getSetting('miniapp_enabled', '1') === '1' });
  res.json({ ok: true, user: u, enabled: H.getSetting('miniapp_enabled', '1') === '1', spins: u ? Number(u.spins_available || 0) : 0 });
});

app.post('/api/logout', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (u) { u.session_active = false; saveDB(); }
  res.json({ ok: true });
});

app.post('/api/register', auth, (req, res) => {
  const { name, phone, password, password2, referral_code } = req.body;
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
  H.generateReferralCode(u.id);
  let refResult = null;
  if (referral_code && String(referral_code).trim()) {
    refResult = H.processReferral(u.id, String(referral_code).trim().toUpperCase());
  }
  saveLocalBackup('register');
  res.json({ ok: true, user: u, referral: refResult });
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
  H.generateReferralCode(user.id);
  res.json({ ok: true, user });
});

app.get('/api/banners', auth, (req, res) => {
  const list = (dbData.banners || []).filter(b => b.active);
  res.json({ ok: true, banners: list });
});

app.get('/api/games', auth, (req, res) => res.json({ ok: true, games: H.listGames() }));
app.get('/api/items/:gameId', auth, (req, res) => {
  const items = H.listItems(req.params.gameId).map(i => ({ ...i, stock: H.getStockCount(i.id) }));
  res.json({ ok: true, items });
});

app.get('/api/order/:id', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.status(401).json({ ok: false, error: 'no user' });
  const o = H.getOrder(Number(req.params.id));
  if (!o || o.user_id !== u.id) return res.status(404).json({ ok: false, error: 'not found' });
  const timeline = [
    { step: 'created', label: 'Order တင်ပြီး', at: o.created_at, done: true },
    { step: 'pending', label: 'Admin စစ်ဆေးနေသည်', at: o.created_at, done: o.status !== 'pending' },
    { step: 'processing', label: 'ဆောင်ရွက်နေသည်', at: null, done: o.status === 'completed' },
    { step: 'completed', label: 'ပြီးစီးပြီ', at: o.processed_at, done: o.status === 'completed' }
  ];
  res.json({ ok: true, order: o, timeline });
});

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
    const cap = `📥 Deposit #${depId}\n👤 ${u.name || u.first_name || ''}\n📱 ${u.phone}\n💵 ${amount} MMK\n🏦 ${method}`;
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
      const cap = `💬 New Message\n\n👤 ${u.name || u.first_name || ''}\n🆔 ${u.telegram_id}\n📱 ${u.phone || '-'}\n\n${msg.text}`;
      const sent = await bot.telegram.sendMessage(ADMIN_ID, cap);
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
  const isAuto = item.auto_delivery === 1;

  if (isAuto) {
    const stock = H.getAvailableStock(item.id);
    if (!stock) return res.status(400).json({ ok: false, error: 'လက်ကျန်ကုန်သွားပါပြီ' });
    const fresh = H.getUserById(u.id);
    if (fresh.balance < item.price) return res.status(400).json({ ok: false, error: 'ငွေမလုံလောက်ပါ' });
    H.addBalance(u.id, -item.price, 'order', item.name, 'purchase');
    const content = H.markStockAsSold(stock.id, u.id);
    const orderId = H.createOrder({ user_id: u.id, item_id: item.id, item_name: item.name, game_id: item.game_id, price: item.price, game_account: null, server_id: null, needs_account: true });
    H.updateOrder(orderId, 'completed');
    if (H.getSetting('loyalty_enabled', '1') === '1') {
      const per = Number(H.getSetting('points_per_1000ks', '10'));
      const earned = Math.floor(item.price / 1000 * per);
      if (earned > 0) H.addPoints(u.id, earned, 'purchase', `Order #${orderId}`);
    }
    let spinsGiven = 0;
    if (H.getSetting('spin_enabled', '1') === '1') {
      const pp = Number(H.getSetting('spin_per_purchase', '1'));
      if (pp > 0) { spinsGiven = pp; H.addSpin(u.id, pp); }
    }
    try { await bot.telegram.sendMessage(u.telegram_id, `🎉 Order #${orderId} — Auto Delivered\n\n📦 ${item.name}\n💵 ${item.price} Ks\n\n${content}`); } catch (e) {}
    if (spinsGiven > 0) { try { await bot.telegram.sendMessage(u.telegram_id, `🎰 ဝယ်ယူမှုအတွက် Spin ${spinsGiven} ခါ ရပါပြီ!\n🎯 Spin ကျန်: ${H.getAvailableSpins(u.id)} ခါ`); } catch (e) {} }
    try { await bot.telegram.sendMessage(ADMIN_ID, `✅ Auto-Delivered\n🛒 Order #${orderId}\n👤 ${u.name}\n📦 ${item.name}`); } catch (e) {}
    return res.json({ ok: true, order_id: orderId, auto_delivered: true, spins_given: spinsGiven });
  }

  if (!needsAccount) { if (!game_account || game_account.length < 3) return res.status(400).json({ ok: false, error: 'Game ID ထည့်ပါ' }); }
  if ((gameId === 'mlbb' || gameId === 'magic-chess')) { if (!server_id || String(server_id).length < 1) return res.status(400).json({ ok: false, error: 'Server ID ထည့်ပါ' }); }
  const fresh = H.getUserById(u.id);
  if (fresh.balance < item.price) return res.status(400).json({ ok: false, error: 'ငွေမလုံလောက်ပါ' });
  H.addBalance(u.id, -item.price, 'order', item.name, 'purchase');
  const orderId = H.createOrder({ user_id: u.id, item_id: item.id, item_name: item.name, game_id: item.game_id, price: item.price, game_account: game_account || null, server_id: server_id || null, needs_account: needsAccount });
  if (H.getSetting('loyalty_enabled', '1') === '1') {
    const per = Number(H.getSetting('points_per_1000ks', '10'));
    const earned = Math.floor(item.price / 1000 * per);
    if (earned > 0) H.addPoints(u.id, earned, 'purchase', `Order #${orderId}`);
  }
  let spinsGiven = 0;
  if (H.getSetting('spin_enabled', '1') === '1') {
    const pp = Number(H.getSetting('spin_per_purchase', '1'));
    if (pp > 0) { spinsGiven = pp; H.addSpin(u.id, pp); }
  }
  saveLocalBackup('order-created');
  let cap = `🛒 New Order #${orderId}\n👤 ${u.name || u.first_name || ''}\n📱 ${u.phone}\n🎮 ${item.game_id}\n📦 ${item.name}\n💵 ${item.price} MMK\n`;
  if (needsAccount) cap += `\n⚠️ App Premium`; else { cap += `🆔 ${game_account}`; if (server_id) cap += `\n🌐 Server: ${server_id}`; }
  try {
    const sent = await bot.telegram.sendMessage(ADMIN_ID, cap, { reply_markup: { inline_keyboard: [[{ text: '✅ ပို့ပြီး', callback_data: `ord:ok:${orderId}` }, { text: '❌ ပယ် (Refund)', callback_data: `ord:no:${orderId}` }]] } });
    const o = H.getOrder(orderId); if (o) { o.admin_msg_id = sent.message_id; saveDB(); }
  } catch (e) {}
  if (spinsGiven > 0) { try { await bot.telegram.sendMessage(u.telegram_id, `🎰 ဝယ်ယူမှုအတွက် Spin ${spinsGiven} ခါ ရပါပြီ!\n🎯 Spin ကျန်: ${H.getAvailableSpins(u.id)} ခါ`); } catch (e) {} }
  if (needsAccount) {
    try {
      const contactLink = `https://t.me/${ADMIN_CONTACT_CLEAN}`;
      const newBal = Number(H.getUserById(u.id).balance).toLocaleString();
      await bot.telegram.sendMessage(u.telegram_id, `✅ Order #${orderId}\n\n📦 ${item.name}\n💵 ${item.price} Ks\n💰 Balance: ${newBal} MMK\n\n📌 Admin ကို ဆက်သွယ်ပါ 📌`, { reply_markup: { inline_keyboard: [[{ text: `👤 Admin ကို ဆက်သွယ်ရန်`, url: contactLink }]] } });
    } catch (e) {}
  }
  res.json({ ok: true, order_id: orderId, spins_given: spinsGiven });
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

app.post('/api/points/balance', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.json({ ok: true, points: 0, rate: 10, minRedeem: 100 });
  res.json({ ok: true, points: H.getUserPoints(u.id), rate: Number(H.getSetting('points_to_ks_rate', '10')), minRedeem: Number(H.getSetting('points_min_redeem', '100')), enabled: H.getSetting('loyalty_enabled', '1') === '1' });
});

app.post('/api/points/redeem', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.status(400).json({ ok: false, error: 'register first' });
  const { points } = req.body;
  const result = H.redeemPoints(u.id, Number(points));
  if (!result.ok) return res.status(400).json(result);
  const fresh = H.getUserById(u.id);
  res.json({ ok: true, ksValue: result.ksValue, newPoints: result.newPoints, newBalance: fresh.balance });
});

app.post('/api/points/history', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.json({ ok: true, history: [] });
  res.json({ ok: true, history: H.listUserPoints(u.id, 30) });
});

app.post('/api/referral/info', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.json({ ok: true, code: null, stats: { count: 0, earned: 0 } });
  const code = H.generateReferralCode(u.id);
  const stats = H.getReferralStats(u.id);
  const baseUrl = PUBLIC_URL || '';
  const refLink = baseUrl ? baseUrl.replace(/\/$/, '') + '/?start=' + code : '';
  const botUsername = 'SafeZoneGametopup26_bot';
  const tgLink = 'https://t.me/' + botUsername + '?start=' + code;
  res.json({ ok: true, code, stats, enabled: H.getSetting('referral_enabled', '1') === '1', refLink, tgLink, botUsername });
});

app.post('/api/promo/redeem', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.status(400).json({ ok: false, error: 'register first' });
  const { code } = req.body;
  if (!code) return res.status(400).json({ ok: false, error: 'Code ထည့်ပါ' });
  const result = H.usePromoCode(code, u.id);
  if (!result.ok) return res.status(400).json(result);
  const fresh = H.getUserById(u.id);
  res.json({ ok: true, bonus: result.bonus, newBalance: fresh.balance, code: result.code });
});

app.post('/api/spin/info', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.json({ ok: true, canSpin: false, available: 0, rewards: [] });
  const avail = H.getAvailableSpins(u.id);
  let rewards = [];
  try { rewards = JSON.parse(H.getSetting('spin_rewards', '[100,200,300,500,1000,2000,5000]')); } catch {}
  res.json({ ok: true, enabled: H.getSetting('spin_enabled', '1') === '1', canSpin: avail > 0, available: avail, cost: 0, rewards });
});

app.post('/api/spin/play', auth, (req, res) => {
  const u = H.getUserByTg(req.tgUser.id);
  if (!u) return res.status(400).json({ ok: false, error: 'register first' });
  const result = H.performSpin(u.id);
  if (!result.ok) return res.status(400).json(result);
  const fresh = H.getUserById(u.id);
  res.json({ ok: true, reward: result.reward, newBalance: fresh.balance, remaining: result.remaining });
});

// ============ ADMIN APIs ============
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!password) return res.status(401).json({ ok: false, error: 'Password ထည့်ပါ' });
  if (password === ADMIN_PASSWORD && (!username || username.toLowerCase().trim() === 'admin')) {
    return res.json({ ok: true, admin: { username: 'admin', name: 'Super Admin', role: 'full', isSuper: true } });
  }
  if (username) {
    const admin = H.getAdminByUsername(username);
    if (!admin) return res.status(401).json({ ok: false, error: 'Username မတွေ့ပါ' });
    if (!admin.active) return res.status(401).json({ ok: false, error: 'Account ပိတ်ထားပါသည်' });
    if (!H.verifyAdminPassword(admin, password)) return res.status(401).json({ ok: false, error: 'Password မှားနေပါသည်' });
    return res.json({ ok: true, admin: { id: admin.id, username: admin.username, name: admin.name, role: admin.role } });
  }
  res.status(401).json({ ok: false, error: 'Username နှင့် Password ထည့်ပါ' });
});

app.get('/api/admin/stats', adminAuth, (req, res) => {
  const s = H.stats();
  const totalBalance = dbData.users.reduce((a, b) => a + Number(b.balance || 0), 0);
  const totalPoints = dbData.users.reduce((a, b) => a + Number(b.points || 0), 0);
  const totalSpins = dbData.users.reduce((a, b) => a + Number(b.spins_available || 0), 0);
  const unreadChats = (dbData.messages || []).filter(m => m.from === 'user' && !m.read_by_admin).length;
  res.json({ ok: true, stats: s, totalBalance, totalPoints, totalSpins, unreadChats, itemsCount: dbData.items.length, enabled: H.getSetting('miniapp_enabled', '1') === '1' });
});

// ===== ADMIN MANAGEMENT =====
app.get('/api/admin/admins', adminAuth, (req, res) => {
  const admins = H.listAdmins().map(a => ({ id: a.id, username: a.username, name: a.name, role: a.role, active: a.active, created_at: a.created_at }));
  res.json({ ok: true, admins, currentAdmin: req.adminName, currentRole: req.adminRole });
});

app.post('/api/admin/admins/add', adminAuth, (req, res) => {
  if (req.adminRole !== 'full') return res.status(403).json({ ok: false, error: 'Permission မရှိပါ' });
  const { username, name, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ ok: false, error: 'Username နှင့် Password ထည့်ပါ' });
  if (username.length < 3) return res.status(400).json({ ok: false, error: 'Username 3 လုံးအထက်' });
  if (!/^[a-z0-9_]+$/.test(username)) return res.status(400).json({ ok: false, error: 'Username တွင် a-z, 0-9, _ သာ' });
  if (password.length < 4) return res.status(400).json({ ok: false, error: 'Password 4 လုံးအထက်' });
  if (H.getAdminByUsername(username)) return res.status(400).json({ ok: false, error: 'Username ရှိပြီးသား' });
  const a = H.createAdmin({ username, name: name || username, password, role: role || 'full' });
  H.addLog(req.adminName, 'admin_add', 'admin:' + a.username, 'role:' + a.role);
  res.json({ ok: true, id: a.id });
});

app.post('/api/admin/admins/toggle', adminAuth, (req, res) => {
  if (req.adminRole !== 'full') return res.status(403).json({ ok: false, error: 'Permission မရှိပါ' });
  const { admin_id } = req.body;
  const a = H.getAdminById(Number(admin_id));
  if (!a) return res.status(400).json({ ok: false, error: 'Admin not found' });
  const newActive = H.toggleAdminActive(Number(admin_id));
  H.addLog(req.adminName, newActive ? 'admin_enable' : 'admin_disable', 'admin:' + a.username, null);
  res.json({ ok: true, active: newActive });
});

app.post('/api/admin/admins/delete', adminAuth, (req, res) => {
  if (req.adminRole !== 'full') return res.status(403).json({ ok: false, error: 'Permission မရှိပါ' });
  const { admin_id } = req.body;
  const a = H.getAdminById(Number(admin_id));
  if (!a) return res.status(400).json({ ok: false, error: 'Admin not found' });
  H.removeAdmin(Number(admin_id));
  H.addLog(req.adminName, 'admin_delete', 'admin:' + a.username, null);
  res.json({ ok: true });
});

app.post('/api/admin/admins/change-password', adminAuth, (req, res) => {
  if (req.adminRole !== 'full') return res.status(403).json({ ok: false, error: 'Permission မရှိပါ' });
  const { admin_id, new_password } = req.body;
  if (!new_password || new_password.length < 4) return res.status(400).json({ ok: false, error: 'Password 4 လုံးအထက်' });
  const a = H.getAdminById(Number(admin_id));
  if (!a) return res.status(400).json({ ok: false, error: 'Admin not found' });
  H.changeAdminPassword(Number(admin_id), new_password);
  H.addLog(req.adminName, 'admin_change_pwd', 'admin:' + a.username, null);
  res.json({ ok: true });
});

// ===== LOGS =====
app.get('/api/admin/logs/detailed', adminAuth, (req, res) => {
  try {
    const limit = Number(req.query.limit) || 200;
    const filter = req.query.action || '';
    let logs = (dbData.logs || []).slice(-limit).reverse();
    if (filter) logs = logs.filter(l => l.action && l.action.includes(filter));
    const enriched = logs.map(l => ({
      ...l,
      timeFormatted: new Date(l.created_at * 1000).toLocaleString(),
      relative: (() => {
        const diff = now() - l.created_at;
        if (diff < 60) return diff + 's ago';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return Math.floor(diff / 86400) + 'd ago';
      })()
    }));
    const actions = {};
    (dbData.logs || []).forEach(l => { if (l.action) actions[l.action] = (actions[l.action] || 0) + 1; });
    res.json({ ok: true, logs: enriched, actions, total: (dbData.logs || []).length });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/admin/logs', adminAuth, (req, res) => res.json({ ok: true, logs: H.listLogs(100) }));

// ===== USERS =====
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
  H.addLog(req.adminName, 'balance_adjust', 'user#' + user_id, amt + ' → ' + newBal);
  res.json({ ok: true, newBalance: newBal });
});

app.post('/api/admin/user/points', adminAuth, (req, res) => {
  const { user_id, points, note } = req.body;
  const pts = Number(points);
  if (!user_id || isNaN(pts)) return res.status(400).json({ ok: false, error: 'Invalid' });
  const newPts = H.addPoints(Number(user_id), pts, 'admin_adjust', note || 'Admin');
  H.addLog(req.adminName, 'points_adjust', 'user#' + user_id, pts + ' → ' + newPts);
  res.json({ ok: true, newPoints: newPts });
});

app.post('/api/admin/user/spins', adminAuth, (req, res) => {
  const { user_id, spins, note } = req.body;
  const sp = Number(spins);
  if (!user_id || isNaN(sp)) return res.status(400).json({ ok: false, error: 'Invalid' });
  const newSp = H.addSpin(Number(user_id), sp);
  H.addLog(req.adminName, 'spins_adjust', 'user#' + user_id, sp + ' → ' + newSp);
  res.json({ ok: true, newSpins: newSp });
});

app.post('/api/admin/user/ban', adminAuth, (req, res) => {
  const { user_id } = req.body;
  const u = H.getUserById(Number(user_id));
  if (!u) return res.status(400).json({ ok: false, error: 'User မတွေ့ပါ' });
  u.banned = u.banned ? 0 : 1;
  saveDB();
  H.addLog(req.adminName, u.banned ? 'ban' : 'unban', 'user#' + user_id, null);
  res.json({ ok: true, banned: !!u.banned });
});

// ===== DEPOSITS =====
app.get('/api/admin/deposits', adminAuth, (req, res) => {
  const status = req.query.status || 'pending';
  const list = status === 'all' ? dbData.deposits.slice().reverse().slice(0, 100) : H.listDeposits(status, 100);
  const enriched = list.map(d => { const u = H.getUserById(d.user_id); return { ...d, user_name: u?.name || u?.first_name || '-', user_phone: u?.phone || '-' }; });
  res.json({ ok: true, deposits: enriched });
});

app.post('/api/admin/deposit/approve', adminAuth, async (req, res) => {
  const { deposit_id } = req.body;
  const d = H.getDeposit(Number(deposit_id));
  if (!d || d.status !== 'pending') return res.status(400).json({ ok: false, error: 'Already processed' });
  const newBal = H.addBalance(d.user_id, d.amount, 'dep#' + d.id, 'Approved', 'deposit');
  H.updateDeposit(d.id, 'approved', req.adminName || 'admin-web');
  H.addLog(req.adminName, 'deposit_approve', 'dep#' + d.id, d.amount + ' MMK');
  const u = H.getUserById(d.user_id);
  try { await bot.telegram.sendMessage(u.telegram_id, `✅ Deposit ${Number(d.amount).toLocaleString()} MMK အတည်ပြုပြီ။\n💰 ${Number(newBal).toLocaleString()} MMK`); } catch(e){}
  res.json({ ok: true, newBalance: newBal });
});

app.post('/api/admin/deposit/reject', adminAuth, async (req, res) => {
  const { deposit_id } = req.body;
  const d = H.getDeposit(Number(deposit_id));
  if (!d || d.status !== 'pending') return res.status(400).json({ ok: false, error: 'Already processed' });
  H.updateDeposit(d.id, 'rejected', req.adminName || 'admin-web');
  H.addLog(req.adminName, 'deposit_reject', 'dep#' + d.id, d.amount + ' MMK');
  const u = H.getUserById(d.user_id);
  try { await bot.telegram.sendMessage(u.telegram_id, `❌ Deposit ပယ်လိုက်ပါသည်။`); } catch(e){}
  res.json({ ok: true });
});

// ===== ORDERS =====
app.get('/api/admin/orders', adminAuth, (req, res) => {
  const status = req.query.status || 'pending';
  const list = status === 'all' ? dbData.orders.slice().reverse().slice(0, 100) : H.listOrders(status, 100);
  const enriched = list.map(o => { const u = H.getUserById(o.user_id); return { ...o, user_name: u?.name || u?.first_name || '-', user_phone: u?.phone || '-' }; });
  res.json({ ok: true, orders: enriched });
});

app.post('/api/admin/order/complete', adminAuth, async (req, res) => {
  const { order_id, account_info } = req.body;
  const o = H.getOrder(Number(order_id));
  if (!o || o.status !== 'pending') return res.status(400).json({ ok: false, error: 'Already processed' });
  H.updateOrder(o.id, 'completed');
  H.addLog(req.adminName, 'order_complete', 'ord#' + o.id, o.item_name);
  const u = H.getUserById(o.user_id);
  if (account_info) { try { await bot.telegram.sendMessage(u.telegram_id, `🎉 Order #${o.id}\n\n📦 ${o.item_name}\n\n${account_info}`); } catch(e){} }
  else { try { await bot.telegram.sendMessage(u.telegram_id, `✅ Order #${o.id} ပို့ပြီး`); } catch(e){} }
  res.json({ ok: true });
});

app.post('/api/admin/order/refund', adminAuth, async (req, res) => {
  const { order_id } = req.body;
  const o = H.getOrder(Number(order_id));
  if (!o || o.status !== 'pending') return res.status(400).json({ ok: false, error: 'Already processed' });
  H.addBalance(o.user_id, o.price, 'refund#' + o.id, 'Refund', 'refund');
  H.updateOrder(o.id, 'rejected');
  H.addLog(req.adminName, 'order_refund', 'ord#' + o.id, o.price + ' MMK');
  const u = H.getUserById(o.user_id);
  try { await bot.telegram.sendMessage(u.telegram_id, `❌ Order #${o.id} ပယ်ပြီး ${o.price} MMK ပြန်ထည့်ပါသည်။`); } catch(e){}
  res.json({ ok: true });
});

// ===== ITEMS =====
app.get('/api/admin/items', adminAuth, (req, res) => {
  const items = dbData.items.map(i => ({ ...i, stock: H.getStockCount(i.id) }));
  res.json({ ok: true, items, games: dbData.games.slice() });
});

app.post('/api/admin/item/add', adminAuth, (req, res) => {
  const { game_id, name, price, category, auto_delivery } = req.body;
  if (!game_id || !name || !price) return res.status(400).json({ ok: false, error: 'Invalid' });
  const id = H.addItem({ game_id, name, price: Number(price), category: category || null, auto_delivery: auto_delivery ? 1 : 0 });
  H.addLog(req.adminName, 'additem', 'item#' + id, game_id + ' ' + name);
  res.json({ ok: true, id });
});

app.post('/api/admin/item/price', adminAuth, (req, res) => { H.setItemPrice(Number(req.body.item_id), Number(req.body.price)); H.addLog(req.adminName, 'setprice', 'item#' + req.body.item_id, req.body.price); res.json({ ok: true }); });
app.post('/api/admin/item/toggle', adminAuth, (req, res) => { H.toggleItem(Number(req.body.item_id)); res.json({ ok: true }); });
app.post('/api/admin/item/toggle-auto', adminAuth, (req, res) => { const auto = H.toggleAutoDelivery(Number(req.body.item_id)); res.json({ ok: true, auto_delivery: auto }); });
app.post('/api/admin/item/delete', adminAuth, (req, res) => { H.removeItem(Number(req.body.item_id)); H.addLog(req.adminName, 'delitem', 'item#' + req.body.item_id, null); res.json({ ok: true }); });

app.get('/api/admin/stocks', adminAuth, (req, res) => {
  const itemId = Number(req.query.item_id);
  if (!itemId) return res.status(400).json({ ok: false, error: 'item_id required' });
  const stocks = H.listStocks(itemId);
  res.json({ ok: true, stocks, available: stocks.filter(s => s.status === 'available').length, sold: stocks.filter(s => s.status === 'sold').length });
});

app.post('/api/admin/stocks/add', adminAuth, (req, res) => {
  const { item_id, contents } = req.body;
  if (!item_id || !contents) return res.status(400).json({ ok: false, error: 'Invalid' });
  const lines = String(contents).split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let added = 0;
  for (const line of lines) { H.addStock(item_id, line); added++; }
  H.addLog(req.adminName, 'add_stock', 'item#' + item_id, added + ' accounts');
  res.json({ ok: true, added });
});

app.post('/api/admin/stocks/delete', adminAuth, (req, res) => { H.removeStock(Number(req.body.stock_id)); res.json({ ok: true }); });

// ===== PROMOS =====
app.get('/api/admin/promo-codes', adminAuth, (req, res) => res.json({ ok: true, promos: H.listPromoCodes() }));
app.post('/api/admin/promo-codes/add', adminAuth, (req, res) => {
  const { code, type, value, max_uses, expires_at, min_purchase } = req.body;
  if (!code || !type || !value) return res.status(400).json({ ok: false, error: 'Invalid' });
  if (H.getPromoByCode(code)) return res.status(400).json({ ok: false, error: 'Code ရှိပြီးသား' });
  const id = H.addPromoCode({ code, type, value, max_uses, expires_at, min_purchase });
  H.addLog(req.adminName, 'add_promo', 'promo#' + id, code);
  res.json({ ok: true, id });
});
app.post('/api/admin/promo-codes/toggle', adminAuth, (req, res) => { H.togglePromoCode(Number(req.body.promo_id)); res.json({ ok: true }); });
app.post('/api/admin/promo-codes/delete', adminAuth, (req, res) => { H.removePromoCode(Number(req.body.promo_id)); res.json({ ok: true }); });

// ===== REFERRALS =====
app.get('/api/admin/referrals', adminAuth, (req, res) => {
  const refs = H.listReferrals(200).map(r => {
    const referrer = H.getUserById(r.referrer_id);
    const referred = H.getUserById(r.referred_id);
    return { ...r, referrer_name: referrer?.name || referrer?.first_name || '-', referred_name: referred?.name || referred?.first_name || '-' };
  });
  res.json({ ok: true, referrals: refs });
});

// ===== POINTS =====
app.get('/api/admin/points-history', adminAuth, (req, res) => {
  const history = dbData.pointsHistory.slice(-200).reverse().map(p => {
    const u = H.getUserById(p.user_id);
    return { ...p, user_name: u?.name || u?.first_name || '-' };
  });
  res.json({ ok: true, history });
});

// ===== SPINS =====
app.get('/api/admin/spins', adminAuth, (req, res) => {
  const spins = H.listSpins(200).map(s => {
    const u = H.getUserById(s.user_id);
    return { ...s, user_name: u?.name || u?.first_name || '-' };
  });
  res.json({ ok: true, spins, totalReward: spins.reduce((s, x) => s + x.reward, 0) });
});

// ===== SETTINGS =====
app.get('/api/admin/settings', adminAuth, (req, res) => res.json({ ok: true, settings: dbData.settings }));
app.post('/api/admin/settings', adminAuth, (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') return res.status(400).json({ ok: false, error: 'Invalid' });
  const allowed = ['miniapp_enabled', 'payment_kbz', 'payment_wave', 'payment_uab', 'payment_aya', 'loyalty_enabled', 'points_per_1000ks', 'points_to_ks_rate', 'points_min_redeem', 'referral_enabled', 'referral_inviter_bonus', 'referral_invitee_bonus', 'spin_enabled', 'spin_per_purchase', 'spin_rewards'];
  let count = 0;
  for (const [k, v] of Object.entries(settings)) { if (allowed.includes(k)) { H.setSetting(k, String(v)); count++; } }
  H.addLog(req.adminName, 'update_settings', null, count + ' settings');
  res.json({ ok: true, count });
});

// ===== ANALYTICS =====
app.get('/api/admin/analytics', adminAuth, (req, res) => {
  const users = dbData.users;
  const orders = dbData.orders;
  const topUsers = users.slice().sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0)).slice(0, 10).map(u => ({ id: u.id, name: u.name || u.first_name || '-', phone: u.phone || '-', balance: Number(u.balance || 0), points: Number(u.points || 0), spins: Number(u.spins_available || 0), totalSpent: orders.filter(o => o.user_id === u.id).reduce((s, o) => s + o.price, 0), orderCount: orders.filter(o => o.user_id === u.id).length }));
  const itemStats = {};
  orders.forEach(o => { const key = o.item_name; if (!itemStats[key]) itemStats[key] = { name: key, game_id: o.game_id, count: 0, revenue: 0 }; itemStats[key].count++; itemStats[key].revenue += o.price; });
  const topItems = Object.values(itemStats).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const dailyReg = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dayStart = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000);
    const dayEnd = dayStart + 86400;
    const count = users.filter(u => u.created_at >= dayStart && u.created_at < dayEnd).length;
    dailyReg.push({ date: d.toISOString().slice(5, 10), count });
  }
  res.json({ ok: true, totalUsers: users.length, activeUsers: users.filter(u => orders.some(o => o.user_id === u.id)).length, topUsers, topItems, dailyReg, totalOrders: orders.length, completedOrders: orders.filter(o => o.status === 'completed').length, totalReferrals: dbData.referrals.length, totalSpins: dbData.spins.length });
});

app.get('/api/admin/revenue', adminAuth, (req, res) => {
  const days = Number(req.query.days) || 7;
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dayStart = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000);
    const dayEnd = dayStart + 86400;
    const dayOrders = dbData.orders.filter(o => o.created_at >= dayStart && o.created_at < dayEnd);
    const dayDeposits = dbData.deposits.filter(x => x.created_at >= dayStart && x.created_at < dayEnd && x.status === 'approved');
    data.push({ date: d.toISOString().slice(5, 10), sales: dayOrders.reduce((s, o) => s + o.price, 0), orders: dayOrders.length, deposits: dayDeposits.reduce((s, x) => s + x.amount, 0), depositCount: dayDeposits.length });
  }
  res.json({ ok: true, data, totalSales: data.reduce((s, d) => s + d.sales, 0), totalDeposits: data.reduce((s, d) => s + d.deposits, 0), totalOrders: data.reduce((s, d) => s + d.orders, 0), days });
});

app.get('/api/admin/quick-replies', adminAuth, (req, res) => {
  try { res.json({ ok: true, replies: JSON.parse(H.getSetting('quick_replies', '[]')) }); }
  catch { res.json({ ok: true, replies: [] }); }
});
app.post('/api/admin/quick-replies', adminAuth, (req, res) => {
  const { replies } = req.body;
  if (!Array.isArray(replies)) return res.status(400).json({ ok: false, error: 'Invalid' });
  H.setSetting('quick_replies', JSON.stringify(replies));
  res.json({ ok: true });
});

app.post('/api/admin/broadcast', adminAuth, async (req, res) => {
  const { message, image_url } = req.body;
  if (!message && !image_url) return res.status(400).json({ ok: false, error: 'Message required' });
  const users = dbData.users.filter(u => u.telegram_id && !u.banned);
  res.json({ ok: true, total: users.length });
  (async () => {
    let success = 0, failed = 0;
    for (const user of users) {
      try { if (image_url) await bot.telegram.sendPhoto(user.telegram_id, image_url, { caption: message }); else await bot.telegram.sendMessage(user.telegram_id, message); success++; }
      catch (e) { failed++; }
      await new Promise(r => setTimeout(r, 50));
    }
    H.addLog(req.adminName, 'broadcast', null, success + ' sent, ' + failed + ' failed');
  })();
});

app.get('/api/admin/banners', adminAuth, (req, res) => res.json({ ok: true, banners: H.listAllBanners() }));
app.post('/api/admin/banner/add', adminAuth, (req, res) => { const { title, subtitle, color1, color2 } = req.body; if (!title) return res.status(400).json({ ok: false, error: 'Title required' }); const id = H.addBanner({ title, subtitle, color1, color2 }); H.addLog(req.adminName, 'add_banner', 'banner#' + id, title); res.json({ ok: true, id }); });
app.post('/api/admin/banner/toggle', adminAuth, (req, res) => { H.toggleBanner(Number(req.body.banner_id)); res.json({ ok: true }); });
app.post('/api/admin/banner/delete', adminAuth, (req, res) => { H.removeBanner(Number(req.body.banner_id)); res.json({ ok: true }); });

app.post('/api/admin/chat/reply', adminAuth, upload.single('photo'), async (req, res) => {
  try {
    const userId = Number(req.body.user_id);
    const text = (req.body.text || '').trim();
    const user = H.getUserById(userId);
    if (!user) return res.status(400).json({ ok: false, error: 'User not found' });
    let photoFileId = null;
    if (req.file) { try { const msg = await bot.telegram.sendPhoto(user.telegram_id, { source: req.file.path }); if (msg.photo?.length) photoFileId = msg.photo[msg.photo.length - 1].file_id; } catch (e) {} }
    if (text) { try { await bot.telegram.sendMessage(user.telegram_id, `💬 Admin:\n\n${text}`); } catch (e) {} }
    dbData.messages.push({ id: dbData._seq.messages++, user_id: user.id, from: 'admin', text: text || '[Photo]', photo_file_id: photoFileId, created_at: now(), read_by_admin: true, read_by_user: false, admin_msg_id: null });
    saveDB();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: 'server error' }); }
});

app.get('/api/admin/chats', adminAuth, (req, res) => {
  const msgs = (dbData.messages || []).filter(m => m.from === 'user').slice(-50).reverse();
  const enriched = msgs.map(m => { const u = H.getUserById(m.user_id); return { ...m, user_name: u?.name || u?.first_name || '-', user_phone: u?.phone || '-' }; });
  res.json({ ok: true, messages: enriched });
});

app.post('/api/admin/toggle-miniapp', adminAuth, (req, res) => {
  const cur = H.getSetting('miniapp_enabled', '1') === '1';
  H.setSetting('miniapp_enabled', cur ? '0' : '1');
  H.addLog(req.adminName, 'toggle_miniapp', null, cur ? 'OFF' : 'ON');
  res.json({ ok: true, enabled: !cur });
});

app.post('/api/admin/backup', adminAuth, async (req, res) => { await sendBackupToAdmin('web-manual'); res.json({ ok: true }); });

// ============ BOT ============
const bot = new Telegraf(BOT_TOKEN);
const isAdmin = (id) => String(id) === ADMIN_ID;

bot.use(async (ctx, next) => { if (ctx.from && isAdmin(ctx.from.id)) H.setSetting('admin_last_seen', String(now())); return next(); });

bot.start(async (ctx) => {
  const u = H.getUserByTg(ctx.from.id);
  const startPayload = ctx.startPayload || '';
  const welcome = `👋 မင်္ဂလာပါ ${ctx.from.first_name || ''}!\n\n🛍️ Safe Zone Game Topup\n\n${u ? `💰 Balance: ${Number(u.balance || 0).toLocaleString()} MMK\n⭐ Points: ${Number(u.points || 0)}\n🎰 Spins: ${Number(u.spins_available || 0)}\n📱 Phone: ${u.phone || '-'}` : '📝 Mini App ထဲဝင်ပြီး အကောင့်ဖွင့်ပါ။'}\n\n💡 ဘာမေးချင်လဲ ရိုက်ပါ — FAQ ကနေ auto ဖြေပါမယ်။`;
  const kbRows = [['💰 Balance', '⭐ Points'], ['🎰 Spins', '👤 အကောင့်']];
  if (startPayload && !u) {
    const baseUrl = PUBLIC_URL || '';
    const refLink = baseUrl ? baseUrl.replace(/\/$/, '') + '/?start=' + startPayload : '';
    const refMsg = `\n\n🎁 Referral Code: ${startPayload}\n` + (refLink ? `📱 အကောင့်ဖွင့်ရန်: ${refLink}` : 'Mini App ထဲမှာ Register လုပ်တဲ့အခါ Code ထည့်ပါ။') + `\n💰 Bonus ${Number(H.getSetting('referral_invitee_bonus', '500')).toLocaleString()} Ks ရပါမယ်!`;
    try { await ctx.reply(welcome + refMsg, Markup.keyboard(kbRows).resize()); return; } catch(e) {}
  }
  await ctx.reply(welcome, Markup.keyboard(kbRows).resize());
});

bot.hears('💰 Balance', async (ctx) => {
  const u = H.getUserByTg(ctx.from.id);
  if (!u) return ctx.reply('⚠️ Mini App ထဲဝင်ပြီး အကောင့်ဖွင့်ပါ။');
  ctx.reply(`💰 ${Number(u.balance || 0).toLocaleString()} MMK\n👤 ${u.name || '-'}\n📱 ${u.phone || '-'}`);
});
bot.hears('⭐ Points', async (ctx) => {
  const u = H.getUserByTg(ctx.from.id);
  if (!u) return ctx.reply('⚠️ Mini App ထဲဝင်ပြီး အကောင့်ဖွင့်ပါ။');
  ctx.reply(`⭐ Points: ${Number(u.points || 0)}\n💰 Balance: ${Number(u.balance || 0).toLocaleString()} MMK`);
});
bot.hears('🎰 Spins', async (ctx) => {
  const u = H.getUserByTg(ctx.from.id);
  if (!u) return ctx.reply('⚠️ Mini App ထဲဝင်ပြီး အကောင့်ဖွင့်ပါ။');
  ctx.reply(`🎰 Spin ကျန်: ${Number(u.spins_available || 0)} ခါ`);
});
bot.hears('👤 အကောင့်', async (ctx) => {
  const u = H.getUserByTg(ctx.from.id);
  if (!u) return ctx.reply('⚠️ Mini App ထဲဝင်ပြီး အကောင့်ဖွင့်ပါ။');
  ctx.reply(`👤 ${u.name || '-'}\n📱 ${u.phone || '-'}\n💰 ${Number(u.balance || 0).toLocaleString()} MMK\n⭐ ${Number(u.points || 0)} Points\n🎰 ${Number(u.spins_available || 0)} Spins\n🆔 #${u.id}`);
});

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
      await bot.telegram.sendMessage(user.telegram_id, `🎉 Order #${order.id}\n\n📦 ${order.item_name}\n💵 ${order.price} Ks\n\n${text}`);
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
      dbData.messages.push({ id: dbData._seq.messages++, user_id: userById.id, from: 'admin', text: text.slice(0, 2000), created_at: now(), read_by_admin: true, read_by_user: false, admin_msg_id: null });
      saveDB();
      await ctx.reply(`✅ ${userById.name || userById.first_name || ''} ဆီ ပို့ပြီး`);
    } catch (e) { ctx.reply('❌ ' + e.message); }
    return;
  }
  return next();
});

bot.on('text', async (ctx, next) => {
  if (isAdmin(ctx.from.id)) return next();
  const text = ctx.message.text || '';
  if (text.startsWith('/')) return next();
  if (ctx.message.reply_to_message) return next();
  const answer = FAQ.findAnswer(text);
  if (answer) {
    const kb = PUBLIC_URL ? { reply_markup: { inline_keyboard: [[{ text: '🛍️ Mini App ဖွင့်', web_app: { url: PUBLIC_URL } }]] } } : {};
    try { await ctx.reply(answer, kb); } catch (e) { await ctx.reply(answer); }
    return;
  }
  const lastSeen = Number(H.getSetting('admin_last_seen', '0'));
  const isOnline = (now() - lastSeen) < AUTO_REPLY_TIMEOUT;
  if (isOnline) await ctx.reply(`✅ Admin online ဖြစ်နေပါသည်။\n\n📩 စာ ရောက်ထားပြီးပါပြီ\n\n📞 @${ADMIN_CONTACT_CLEAN}`);
  else await ctx.reply(`🤖 Admin offline ဖြစ်နေပါသည်။\n\n📩 စာ ရောက်ထားပြီးပါပြီ\n\n📞 @${ADMIN_CONTACT_CLEAN}`);
  return next();
});

async function sendBackupToAdmin(reason = 'manual') {
  try {
    const data = H.backup();
    const json = JSON.stringify(data, null, 2);
    const stats = H.stats();
    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await bot.telegram.sendDocument(ADMIN_ID, { source: Buffer.from(json), filename }, { caption: `💾 Backup (${reason})\n👥 ${stats.users} users` });
  } catch (e) {}
}

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const s = H.stats();
  const enabled = H.getSetting('miniapp_enabled', '1') === '1';
  const text = `🛠️ Admin Panel\n\n👥 Users: ${s.users}\n📥 Deposits: ${s.pendingDeposits}\n🛒 Orders: ${s.pendingOrders}\n💰 Total: ${s.totalDeposit} MMK\n🔌 App: ${enabled ? '✅' : '❌'}`;
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback(`📥 Deposits (${s.pendingDeposits})`, 'adm:deposits')],
    [Markup.button.callback(`🛒 Orders (${s.pendingOrders})`, 'adm:orders')],
    [Markup.button.callback(enabled ? '🔴 ပိတ်မယ်' : '🟢 ဖွင့်မယ်', 'adm:toggle')],
    [Markup.button.callback('💾 Backup', 'adm:backup')]
  ]);
  await ctx.reply(text, { parse_mode: 'Markdown', ...kb });
});

bot.action('adm:toggle', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  const cur = H.getSetting('miniapp_enabled', '1') === '1';
  H.setSetting('miniapp_enabled', cur ? '0' : '1');
  await ctx.answerCbQuery(cur ? '🔴 ပိတ်ပြီ' : '🟢 ဖွင့်ပြီ');
});

bot.action('adm:backup', async (ctx) => { if (!isAdmin(ctx.from.id)) return; await ctx.answerCbQuery('💾'); await sendBackupToAdmin('manual'); });

bot.action('adm:deposits', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  await ctx.answerCbQuery();
  const list = H.listDeposits('pending', 20);
  if (!list.length) return ctx.reply('📥 မရှိပါ။');
  for (const d of list) {
    const u = H.getUserById(d.user_id);
    const cap = `📥 Deposit #${d.id}\n👤 ${u?.name || ''}\n📱 ${u?.phone || ''}\n💵 ${d.amount} MMK\n🏦 ${d.method}`;
    const kb = Markup.inlineKeyboard([[Markup.button.callback('✅ Approve', `dep:ok:${d.id}`), Markup.button.callback('❌ Reject', `dep:no:${d.id}`)]]);
    try { if (d.receipt_file_id) await ctx.telegram.sendPhoto(ctx.from.id, d.receipt_file_id, { caption: cap, ...kb }); else if (d.receipt_local && fs.existsSync(d.receipt_local)) await ctx.telegram.sendPhoto(ctx.from.id, { source: d.receipt_local }, { caption: cap, ...kb }); else await ctx.reply(cap, kb); } catch (e) { await ctx.reply(cap, kb); }
  }
});

bot.action('adm:orders', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  await ctx.answerCbQuery();
  const list = H.listOrders('pending', 20);
  if (!list.length) return ctx.reply('🛒 မရှိပါ။');
  for (const o of list) {
    const u = H.getUserById(o.user_id);
    let cap = `🛒 Order #${o.id}\n👤 ${u?.name || ''}\n📱 ${u?.phone}\n🎮 ${o.game_id}\n📦 ${o.item_name}\n💵 ${o.price} MMK\n`;
    if (o.needs_account) cap += `⚠️ App Premium`; else { cap += `🆔 ${o.game_account}`; if (o.server_id) cap += `\n🌐 ${o.server_id}`; }
    const kb = Markup.inlineKeyboard([[Markup.button.callback('✅ ပို့ပြီး', `ord:ok:${o.id}`), Markup.button.callback('❌ ပယ် (Refund)', `ord:no:${o.id}`)]]);
    const sent = await ctx.reply(cap, kb);
    const order = H.getOrder(o.id); if (order && !order.admin_msg_id) { order.admin_msg_id = sent.message_id; saveDB(); }
  }
});

bot.action(/^dep:ok:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  const d = H.getDeposit(Number(ctx.match[1]));
  if (!d || d.status !== 'pending') return ctx.answerCbQuery('Already');
  const newBal = H.addBalance(d.user_id, d.amount, 'dep#' + d.id, 'Approved', 'deposit');
  H.updateDeposit(d.id, 'approved', String(ctx.from.id));
  await ctx.answerCbQuery('✅');
  const u = H.getUserById(d.user_id);
  try { await ctx.telegram.sendMessage(u.telegram_id, `✅ Deposit ${Number(d.amount).toLocaleString()} MMK အတည်ပြုပြီ။\n💰 ${Number(newBal).toLocaleString()} MMK`); } catch(e) {}
  try { await ctx.editMessageCaption(`✅ APPROVED — #${d.id}`).catch(()=>{}); } catch(e) {}
  try { await ctx.editMessageReplyMarkup(undefined).catch(()=>{}); } catch(e) {}
});
bot.action(/^dep:no:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  const d = H.getDeposit(Number(ctx.match[1]));
  if (!d || d.status !== 'pending') return ctx.answerCbQuery('Already');
  H.updateDeposit(d.id, 'rejected', String(ctx.from.id));
  await ctx.answerCbQuery('❌');
  const u = H.getUserById(d.user_id);
  try { await ctx.telegram.sendMessage(u.telegram_id, `❌ Deposit ပယ်လိုက်ပါသည်။`); } catch(e) {}
  try { await ctx.editMessageCaption(`❌ REJECTED — #${d.id}`).catch(()=>{}); } catch(e) {}
  try { await ctx.editMessageReplyMarkup(undefined).catch(()=>{}); } catch(e) {}
});
bot.action(/^ord:ok:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  const o = H.getOrder(Number(ctx.match[1]));
  if (!o || o.status !== 'pending') return ctx.answerCbQuery('Already');
  H.updateOrder(o.id, 'completed');
  await ctx.answerCbQuery('✅');
  const u = H.getUserById(o.user_id);
  try { await ctx.telegram.sendMessage(u.telegram_id, `✅ Order #${o.id} ပို့ပြီး`); } catch(e) {}
  try { await ctx.editMessageText(`✅ COMPLETED — #${o.id}`).catch(()=>{}); } catch(e) {}
  try { await ctx.editMessageReplyMarkup(undefined).catch(()=>{}); } catch(e) {}
});
bot.action(/^ord:no:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
  const o = H.getOrder(Number(ctx.match[1]));
  if (!o || o.status !== 'pending') return ctx.answerCbQuery('Already');
  H.addBalance(o.user_id, o.price, 'refund#' + o.id, 'Refund', 'refund');
  H.updateOrder(o.id, 'rejected');
  await ctx.answerCbQuery('❌ Refunded');
  const u = H.getUserById(o.user_id);
  try { await bot.telegram.sendMessage(u.telegram_id, `❌ Order #${o.id} ပယ်ပြီး ${o.price} MMK ပြန်ထည့်ပါသည်။`); } catch(e) {}
  try { await ctx.editMessageText(`❌ REFUNDED — #${o.id}`).catch(()=>{}); } catch(e) {}
  try { await ctx.editMessageReplyMarkup(undefined).catch(()=>{}); } catch(e) {}
});

bot.command('backupnow', async (ctx) => { if (!isAdmin(ctx.from.id)) return; await sendBackupToAdmin('manual'); await ctx.reply('✅ Backup sent'); });

app.listen(PORT, () => {
  console.log(`\n═══════════════════════════`);
  console.log(`  🛡️  SAFE ZONE — Running`);
  console.log(`  🌐 Port: ${PORT}`);
  console.log(`  👥 Users: ${dbData.users.length}`);
  console.log(`  👤 Admins: ${dbData.admins.length}`);
  console.log(`═══════════════════════════\n`);
});

async function launchBot(retries = 5) {
  for (let i = 1; i <= retries; i++) {
    try { await bot.launch(); LOG.ok('Bot started'); return true; }
    catch (err) { LOG.error(`Launch ${i} failed:`, err.message); if (i < retries) await new Promise(r => setTimeout(r, i * 3000)); }
  }
  return false;
}
launchBot().then(async (success) => { if (success) { saveLocalBackup('startup'); LOG.ok('System ready'); } });

let isShuttingDown = false;
async function gracefulShutdown(signal) {
  if (isShuttingDown) return; isShuttingDown = true;
  try { saveLocalBackup('shutdown'); } catch (e) {}
  try { if (bot && typeof bot.stop === 'function') await bot.stop(signal); } catch (e) {}
  process.exit(0);
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (err) => { LOG.error('Uncaught:', err.message); if (!isShuttingDown) gracefulShutdown('uncaughtException'); });
process.on('unhandledRejection', (r) => { LOG.warn('Unhandled:', r); });
