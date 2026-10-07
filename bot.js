let botOffset = 0;
let running = false;
let getDb, saveDb;
const userStates = {};
const LINE = '━━━━━━━━━━━━━━━━━━━━━';

function tgApi(method, body, token) {
  if (!token) return Promise.resolve(null);
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  }).then(r => r.json()).catch(() => null);
}
async function tgSendTo(chatId, text, keyboard) {
  const db = getDb();
  if (!db.config.telegramBotToken) return;
  return tgApi('sendMessage', { chat_id: chatId, text, parse_mode:'HTML',
    disable_web_page_preview: true,
    reply_markup: keyboard ? {inline_keyboard: keyboard} : undefined }, db.config.telegramBotToken);
}
async function tgEditTo(chatId, msgId, text, keyboard) {
  const db = getDb();
  if (!db.config.telegramBotToken) return;
  return tgApi('editMessageText', { chat_id: chatId, message_id: msgId, text, parse_mode:'HTML',
    disable_web_page_preview: true,
    reply_markup: keyboard ? {inline_keyboard: keyboard} : undefined }, db.config.telegramBotToken);
}
async function tgAnswer(cbId, text, alert) {
  const db = getDb();
  return tgApi('answerCallbackQuery', { callback_query_id: cbId, text, show_alert: !!alert }, db.config.telegramBotToken);
}
function tgSend(text, keyboard) { return tgSendTo(getDb().config.telegramChatId, text, keyboard); }
function tgEdit(msgId, text, keyboard) { return tgEditTo(getDb().config.telegramChatId, msgId, text, keyboard); }

const HEADER_ADMIN = `╔══════════════════════╗\n║  🎮  <b>SAFE ZONE</b>  🎮  ║\n║   <i>Admin Control</i>   ║\n╚══════════════════════╝`;
const HEADER_USER = `╔══════════════════════╗\n║  🎮  <b>SAFE ZONE</b>  🎮  ║\n║    <i>Game Topup</i>     ║\n╚══════════════════════╝`;

const FAQ_TEXT = `${HEADER_USER}\n\n<b>❓ FAQ</b>\n\n${LINE}\n\n<b>1️⃣  💰 Deposit ဘယ်လောက်ကြာမလဲ?</b>\n   <i>၅-၁၅ မိနစ်အတွင်း approve</i>\n\n<b>2️⃣  ❌ Order Reject ဖြစ်ရင်?</b>\n   <i>Balance ပြန်အမ်းပါတယ်</i>\n\n<b>3️⃣  🆔 Player ID မှားထည့်မိရင်?</b>\n   <i>Live Chat မှာ အသိပေးပါ</i>\n\n<b>4️⃣  ⏱️ Order ဘယ်လောက်ကြာမလဲ?</b>\n   <i>၁၀-၃၀ မိနစ်အတွင်း</i>\n\n<b>5️⃣  🔄 Order မှားမှာမိရင်?</b>\n   <i>Pending ဖြစ်နေတုန်း Chat မှာ ပြောပါ</i>\n\n<b>6️⃣  🔖 Ref No. မရှိရင်?</b>\n   <i>KBZ/Wave History မှာ ရှာပါ</i>\n\n<b>7️⃣  💬 Chat ဖွင့်ချိန်?</b>\n   <i>၂၄ နာရီ</i>\n\n<b>8️⃣  💵 ငွေဖြည့်နည်း?</b>\n   <i>KBZ / Wave / UAB / AYA</i>\n   <i>→ 09763442881 (Mg Pyae Phyo Kyaw)</i>\n\n${LINE}\n\n<i>💡 အဖြေ မတွေ့ရင် Live Chat မှာ မေးပါ</i>`;

const SOCIAL_KEYBOARD = [
  [{text:'📘 Facebook', url:'https://facebook.com/safezone'}, {text:'🎵 TikTok', url:'https://tiktok.com/@safezone'}],
  [{text:'💬 WhatsApp', url:'https://wa.me/959763442881'}, {text:'📞 Viber', url:'viber://chat?number=959763442881'}]
];

const USER_MAIN = [
  [{text:'💰  လက်ကျန်ငွေ', callback_data:'u|balance'}, {text:'📦  Orders', callback_data:'u|orders'}],
  [{text:'🛒  Buy (Order တင်)', callback_data:'u|buy'}, {text:'💳  Deposit နည်း', callback_data:'u|how'}],
  [{text:'💬  Chat Admin', callback_data:'u|chat'}, {text:'🔗  Social Links', callback_data:'u|social'}],
  [{text:'❓  FAQ', callback_data:'u|faq'}, {text:'👤  Profile', callback_data:'u|profile'}]
];
const USER_NOT_LINKED = [
  [{text:'🔗  Account ချိတ်ဆက်', callback_data:'u|link'}],
  [{text:'🔗  Social Links', callback_data:'u|social'}, {text:'❓  FAQ', callback_data:'u|faq'}]
];
const ADMIN_MAIN = [
  [{text:'📊  Pending', callback_data:'menu|pending'}, {text:'📈  Stats', callback_data:'menu|stats'}],
  [{text:'👥  Users', callback_data:'menu|users'}, {text:'💬  Chats', callback_data:'menu|chats'}],
  [{text:'📢  Broadcast', callback_data:'menu|broadcast'}, {text:'❓  FAQ', callback_data:'menu|faq'}],
  [{text:'🏠  Main', callback_data:'menu|start'}]
];

function depositKeyboard(id, status) {
  if (status !== 'pending') return [];
  return [[{text:'✅  အတည်ပြု', callback_data:'dep|approve|'+id}, {text:'❌  ပယ်ဖျက်', callback_data:'dep|reject|'+id}]];
}
function orderKeyboard(id, status) {
  if (status === 'completed' || status === 'rejected') return [];
  if (status === 'pending') return [
    [{text:'⚙️  ပြင်ဆင်နေ', callback_data:'ord|processing|'+id}, {text:'✅  ပြီးစီး', callback_data:'ord|completed|'+id}],
    [{text:'❌  ပယ်ဖျက်', callback_data:'ord|rejected|'+id}]
  ];
  if (status === 'processing') return [[
    {text:'✅  ပြီးစီးကြောင်း', callback_data:'ord|completed|'+id}, {text:'❌  ပယ်ဖျက်', callback_data:'ord|rejected|'+id}
  ]];
  return [];
}
function depositCard(d) {
  const emoji = d.status === 'pending' ? '⏳' : d.status === 'approved' ? '✅' : '❌';
  return `${emoji} <b>DEPOSIT ${d.status.toUpperCase()}</b>\n\n${LINE}\n   👤  <b>${d.username}</b>\n   💵  <b>${d.amount.toLocaleString()} Ks</b>\n   📱  ${d.method}\n   🔖  <code>${d.ref}</code>\n${LINE}\n   🆔  <code>${d.id}</code>`;
}
function orderCard(o) {
  const emoji = {pending:'⏳', processing:'⚙️', completed:'✅', rejected:'❌'}[o.status] || 'ℹ️';
  return `${emoji} <b>ORDER ${o.status.toUpperCase()}</b>\n\n${LINE}\n   👤  <b>${o.username}</b>\n   🎮  ${o.game}\n   📦  ${o.product}\n   💵  <b>${o.price.toLocaleString()} Ks</b>\n   🆔  <code>${o.playerId}</code>\n${LINE}\n   🔖  <code>${o.id}</code>`;
}

async function showUserMenu(chatId, user, preText) {
  const text = (preText ? preText + '\n\n' : '') +
`${HEADER_USER}\n\n   👤  <b>${user.username}</b>\n   💰  <b>${user.balance.toLocaleString()} Ks</b>\n   ⭐  ${user.points || 0} Points · ${user.vip || 'Bronze'}\n\n${LINE}\n\n<i>ခလုတ်တွေ နှိပ်ပါ</i>`;
  return tgSendTo(chatId, text, USER_MAIN);
}
async function showUserNotLinked(chatId) {
  return tgSendTo(chatId,
`${HEADER_USER}\n\n<b>👋 ကြိုဆိုပါတယ်!</b>\n\nWebsite account နဲ့ ချိတ်ဆက်ပါ:\n   ✅  Balance ကြည့်\n   ✅  Order တင်\n   ✅  Chat Admin\n   ✅  FAQ\n\n${LINE}`, USER_NOT_LINKED);
}

async function handleUserFlow(chatId, u, db) {
  const user = db.users.find(x => x.telegramId === String(chatId));
  const state = userStates[chatId] || {};

  if (!user) {
    if (u.callback_query) {
      const cq = u.callback_query;
      const parts = (cq.data||'').split('|');
      if (parts[0] !== 'u') return;
      const action = parts[1];
      if (action === 'link') {
        userStates[chatId] = { step:'wait_username' };
        await tgAnswer(cq.id, '🔗');
        return tgSendTo(chatId, `🔗 <b>Account ချိတ်ဆက်ခြင်း</b>\n\n${LINE}\n   <b>Step 1/2</b> — Username ရိုက်ပါ\n${LINE}`);
      }
      if (action === 'faq') { await tgAnswer(cq.id, '❓'); return tgSendTo(chatId, FAQ_TEXT, [[{text:'🔗 Account ချိတ်', callback_data:'u|link'}]]); }
      if (action === 'social') { await tgAnswer(cq.id, '🔗'); return tgSendTo(chatId, `🔗 <b>Social Links</b>\n\n${LINE}`, SOCIAL_KEYBOARD); }
      return;
    }
    if (u.message && u.message.text) {
      const txt = u.message.text.trim();
      if (txt.startsWith('/start')) return showUserNotLinked(chatId);
      if (txt === '/link') { userStates[chatId] = { step:'wait_username' }; return tgSendTo(chatId, '🔗 Username ရိုက်ပါ'); }
      if (txt === '/faq') return tgSendTo(chatId, FAQ_TEXT, [[{text:'🔗 Account ချိတ်', callback_data:'u|link'}]]);
      if (state.step === 'wait_username') {
        const uname = txt;
        const check = db.users.find(u2 => u2.username === uname);
        if (!check) { delete userStates[chatId]; return tgSendTo(chatId, '❌ Username မတွေ့ပါ\n/link ပြန်စမ်းပါ', [[{text:'🔗 ပြန်စမ်း', callback_data:'u|link'}]]); }
        userStates[chatId] = { step:'wait_password', username: uname };
        return tgSendTo(chatId, `🔐 <b>Step 2/2</b> — Password ရိုက်ပါ`);
      }
      if (state.step === 'wait_password') {
        const pwd = txt;
        const usr = db.users.find(x => x.username === state.username && x.password === pwd);
        delete userStates[chatId];
        if (!usr) return tgSendTo(chatId, '❌ Password မှားပါ', [[{text:'🔗 ပြန်စမ်း', callback_data:'u|link'}]]);
        usr.telegramId = String(chatId); saveDb();
        return showUserMenu(chatId, usr, '✅ <b>Account ချိတ်ပြီးပါပြီ!</b>');
      }
      return tgSendTo(chatId, '💡 /start ရိုက်ပါ');
    }
    return;
  }

  if (u.callback_query) {
    const cq = u.callback_query;
    const parts = (cq.data||'').split('|');
    if (parts[0] !== 'u') return;
    const action = parts[1];
    if (action === 'balance') {
      await tgAnswer(cq.id, '💰');
      return tgEditTo(chatId, cq.message.message_id,
`╔══════════════════════╗\n║   💰  <b>BALANCE</b>   ║\n╚══════════════════════╝\n\n${LINE}\n   👤  <b>${user.username}</b>\n   💵  <b>${user.balance.toLocaleString()} Ks</b>\n   ⭐  ${user.points || 0} Points · ${user.vip || 'Bronze'}\n   💸  Cashback: ${(user.cashback||0).toLocaleString()} Ks\n   🎁  Code: <code>${user.referralCode}</code>\n${LINE}`,
        [[{text:'🏠 Main Menu', callback_data:'u|menu'}]]);
    }
    if (action === 'orders') {
      await tgAnswer(cq.id, '📦');
      const orders = db.orders.filter(o => o.userId === user.id).reverse().slice(0, 5);
      if (!orders.length) return tgEditTo(chatId, cq.message.message_id, `📦 <b>ORDERS</b>\n\n${LINE}\n   <i>မရှိသေးပါ</i>`, [[{text:'🏠 Menu', callback_data:'u|menu'}]]);
      const text = `📦 <b>MY ORDERS</b>\n\n` + orders.map(o=>{
        const em = {pending:'⏳',processing:'⚙️',completed:'✅',rejected:'❌'}[o.status];
        return `${em}  <b>${o.game}</b> — ${o.product}\n      💵 ${o.price.toLocaleString()} Ks · <i>${o.status}</i>\n      🔄 <code>/reorder ${o.id}</code>`;
      }).join('\n\n');
      return tgEditTo(chatId, cq.message.message_id, text, [[{text:'🏠 Menu', callback_data:'u|menu'}]]);
    }
    // FEATURE 50 — Buy from Bot
    if (action === 'buy') {
      await tgAnswer(cq.id, '🛒');
      const games = [...new Set(db.products.map(p => p.game))];
      const kb = games.map(g => [{text:'🎮 ' + g, callback_data:'u|game|'+g}]);
      kb.push([{text:'🏠 Menu', callback_data:'u|menu'}]);
      return tgEditTo(chatId, cq.message.message_id,
`🛒 <b>ORDER တင်</b>\n\n${LINE}\n   ဂိမ်း ရွေးပါ 👇\n${LINE}`,
        kb);
    }
    if (action === 'game') {
      await tgAnswer(cq.id, '🎮');
      const game = parts.slice(2).join('|');
      const prods = db.products.filter(p => p.game === game);
      const kb = prods.map(p => [{text:`${p.image} ${p.name} — ${p.price.toLocaleString()} Ks`, callback_data:`u|prod|${p.id}`}]);
      kb.push([{text:'🔙 Back', callback_data:'u|buy'}]);
      return tgEditTo(chatId, cq.message.message_id,
`🎮 <b>${game}</b>\n\n${LINE}\n   Package ရွေးပါ 👇`,
        kb);
    }
    if (action === 'prod') {
      const pid = Number(parts[2]);
      const product = db.products.find(p => p.id === pid);
      if (!product) return tgAnswer(cq.id, '❌ မတွေ့', true);
      userStates[chatId] = { step:'wait_playerid', productId: pid };
      await tgAnswer(cq.id, '✅');
      return tgEditTo(chatId, cq.message.message_id,
`📦 <b>${product.name}</b>\n\n${LINE}\n   💵  ${product.price.toLocaleString()} Ks\n   🎮  ${product.game}\n${LINE}\n\n<b>Player ID / UID ရိုက်ပါ</b>`,
        [[{text:'🔙 Cancel', callback_data:'u|buy'}]]);
    }
    if (action === 'how') {
      await tgAnswer(cq.id, '💳');
      return tgEditTo(chatId, cq.message.message_id,
`╔══════════════════════╗\n║   💳  <b>DEPOSIT နည်း</b>   ║\n╚══════════════════════╝\n\n<b>၁။</b> KBZ/Wave/UAB/AYA app ဖွင့်\n<b>၂။</b> ငွေလွှဲ:\n   📱 <code>09763442881</code>\n   👤 Mg Pyae Phyo Kyaw\n<b>၃။</b> Ref No. copy\n<b>၄။</b> Website → Wallet → Deposit\n\n${LINE}\n<i>⏱ ၅-၁၅ မိနစ်</i>`,
        [[{text:'🏠 Menu', callback_data:'u|menu'}]]);
    }
    if (action === 'chat') {
      await tgAnswer(cq.id, '💬');
      return tgEditTo(chatId, cq.message.message_id,
`💬 <b>CHAT ADMIN</b>\n\n${LINE}\n<b>နည်း ၁:</b> Website → Chat\n<b>နည်း ၂:</b> ဒီ bot မှာ စာရေး\n\n<i>👉 စာရေးလိုက်ပါ</i>`,
        [[{text:'🏠 Menu', callback_data:'u|menu'}]]);
    }
    if (action === 'social') {
      await tgAnswer(cq.id, '🔗');
      return tgEditTo(chatId, cq.message.message_id, `🔗 <b>Social Links</b>\n\n${LINE}`, SOCIAL_KEYBOARD.concat([[{text:'🏠 Menu', callback_data:'u|menu'}]]));
    }
    if (action === 'faq') { await tgAnswer(cq.id, '❓'); return tgEditTo(chatId, cq.message.message_id, FAQ_TEXT, [[{text:'🏠 Menu', callback_data:'u|menu'}]]); }
    if (action === 'profile') {
      await tgAnswer(cq.id, '👤');
      return tgEditTo(chatId, cq.message.message_id,
`╔══════════════════════╗\n║   👤  <b>PROFILE</b>   ║\n╚══════════════════════╝\n\n${LINE}\n   👤  <b>${user.username}</b>\n   📱  ${user.phone || '-'}\n   💰  ${user.balance.toLocaleString()} Ks\n   ⭐  ${user.points || 0} Points\n   💎  ${user.vip || 'Bronze'} VIP\n   💸  ${(user.cashback||0).toLocaleString()} Cashback\n   🏆  ${(user.achievements||[]).length} Achievements\n${LINE}\n   📅  ${new Date(user.createdAt).toLocaleDateString('en-GB')}`,
        [[{text:'🚪 Unlink', callback_data:'u|unlink'}], [{text:'🏠 Menu', callback_data:'u|menu'}]]);
    }
    if (action === 'unlink') {
      await tgAnswer(cq.id, '🚪');
      user.telegramId = null; saveDb();
      return tgSendTo(chatId, '🚪 Unlink ပြီးပါပြီ\n/link ပြန်ချိတ်နိုင်ပါတယ်', USER_NOT_LINKED);
    }
    if (action === 'menu') { await tgAnswer(cq.id, '🏠'); return showUserMenu(chatId, user); }
    return;
  }

  if (u.message && u.message.text) {
    const txt = u.message.text.trim();

    // FEATURE 52 — Screenshot send
    if (u.message.photo) {
      const fileId = u.message.photo[u.message.photo.length-1].file_id;
      const m = { id:'C'+Date.now()+Math.random().toString(36).slice(2,5), userId: user.id,
        username: user.username, from:'user', text: '[📷 Screenshot]', image: fileId,
        createdAt: Date.now(), read:false };
      db.chats.push(m); saveDb();
      const adminId = db.config.telegramChatId;
      if (adminId) await tgApi('sendPhoto', { chat_id: adminId, photo: fileId,
        caption: `📷 Screenshot from <b>${user.username}</b>`, parse_mode:'HTML' }, db.config.telegramBotToken);
      return tgSendTo(chatId, '✅ Screenshot ပို့ပြီးပါပြီ', USER_MAIN);
    }

    // FEATURE 14 — Reorder via bot
    if (txt.startsWith('/reorder')) {
      const orderId = txt.split(' ')[1];
      const prev = db.orders.find(o => o.id === orderId && o.userId === user.id);
      if (!prev) return tgSendTo(chatId, '❌ Order မတွေ့', USER_MAIN);
      const product = db.products.find(p => p.game === prev.game && p.name === prev.product);
      if (!product) return tgSendTo(chatId, '❌ Product မတွေ့တော့ပါ', USER_MAIN);
      if (user.balance < product.price) return tgSendTo(chatId, '❌ Balance မလုံလောက်', USER_MAIN);
      user.balance -= product.price;
      const order = { id:'ORD'+Date.now(), userId:user.id, username:user.username,
        product: product.name, game: product.game, price: product.price,
        playerId: prev.playerId, status:'pending', createdAt: Date.now() };
      db.orders.push(order); saveDb();
      // notify admin
      await tgSend(`🎮 <b>NEW ORDER (Reorder)</b>\n\n` + orderCard(order), orderKeyboard(order.id, order.status));
      return tgSendTo(chatId,
`✅ <b>Reorder အောင်မြင်ပါပြီ</b>\n\n${LINE}\n   🎮 ${product.game}\n   📦 ${product.name}\n   💵 ${product.price.toLocaleString()} Ks\n   🆔 ${prev.playerId}\n   🔖 <code>${order.id}</code>\n${LINE}`, USER_MAIN);
    }

    // Order state
    if (state.step === 'wait_playerid') {
      const productId = state.productId;
      const product = db.products.find(p => p.id === productId);
      delete userStates[chatId];
      if (!product) return tgSendTo(chatId, '❌ Product မတွေ့', USER_MAIN);
      if (user.balance < product.price) return tgSendTo(chatId, `❌ Balance မလုံလောက်ပါ\nလိုအပ်: ${product.price.toLocaleString()} Ks`, USER_MAIN);
      user.balance -= product.price;
      user.totalSpent = (user.totalSpent || 0) + product.price;
      const order = { id:'ORD'+Date.now(), userId:user.id, username:user.username,
        product: product.name, game: product.game, price: product.price,
        playerId: txt, status:'pending', createdAt: Date.now() };
      db.orders.push(order); saveDb();
      await tgSend(`🎮 <b>NEW ORDER</b>\n\n` + orderCard(order), orderKeyboard(order.id, order.status));
      return tgSendTo(chatId,
`✅ <b>Order တင်ပြီးပါပြီ!</b>\n\n${LINE}\n   🎮 ${product.game}\n   📦 ${product.name}\n   💵 ${product.price.toLocaleString()} Ks\n   🆔 ${txt}\n   🔖 <code>${order.id}</code>\n${LINE}\n\n<i>Admin approve ရင် ဆက်လုပ်ပေးမယ်</i>`, USER_MAIN);
    }

    if (txt.startsWith('/start') || txt === '/menu') return showUserMenu(chatId, user);
    if (txt === '/balance') return tgSendTo(chatId, `💰 <b>${user.balance.toLocaleString()} Ks</b>`, USER_MAIN);
    if (txt === '/faq') return tgSendTo(chatId, FAQ_TEXT, USER_MAIN);
    if (txt === '/buy') {
      const games = [...new Set(db.products.map(p => p.game))];
      const kb = games.map(g => [{text:'🎮 ' + g, callback_data:'u|game|'+g}]);
      kb.push([{text:'🏠 Menu', callback_data:'u|menu'}]);
      return tgSendTo(chatId, `🛒 <b>ORDER တင်</b>\n\nဂိမ်း ရွေးပါ`, kb);
    }
    if (txt === '/unlink') { user.telegramId = null; saveDb(); return tgSendTo(chatId, '🚪 Unlink ပြီးပါပြီ', USER_NOT_LINKED); }

    // Chat to admin
    const m = { id:'C'+Date.now()+Math.random().toString(36).slice(2,5), userId:user.id,
      username:user.username, from:'user', text:txt, createdAt:Date.now(), read:false };
    db.chats.push(m); saveDb();
    const adminId = db.config.telegramChatId;
    if (adminId) await tgApi('sendMessage', { chat_id: adminId,
      text: `💬 <b>MESSAGE</b> — ${user.username}\n\n<i>"${txt.slice(0,200)}"</i>`, parse_mode:'HTML' }, db.config.telegramBotToken);
    return tgSendTo(chatId, `✅ စာ ပို့ပြီးပါပြီ`, USER_MAIN);
  }
}

async function handleAdminFlow(chatId, u, db) {
  if (u.callback_query) {
    const cq = u.callback_query;
    const parts = (cq.data || '').split('|');
    const kind = parts[0];
    if (kind === 'menu') {
      const action = parts[1];
      if (action === 'start') { await tgEdit(cq.message.message_id, `${HEADER_ADMIN}\n\n<b>👋 Admin</b>`, ADMIN_MAIN); return tgAnswer(cq.id, '🏠'); }
      if (action === 'pending') { await tgAnswer(cq.id, '⏳'); return showPending(chatId); }
      if (action === 'stats') { await tgAnswer(cq.id, '📊'); return showStats(chatId); }
      if (action === 'users') { await tgAnswer(cq.id, '👥'); return showUsers(chatId); }
      if (action === 'chats') { await tgAnswer(cq.id, '💬'); return showChats(chatId); }
      if (action === 'faq') { await tgEdit(cq.message.message_id, FAQ_TEXT, [[{text:'🏠 Menu', callback_data:'menu|start'}]]); return tgAnswer(cq.id, '❓'); }
      if (action === 'broadcast') {
        userStates[chatId] = { adminStep: 'wait_broadcast' };
        await tgAnswer(cq.id, '📢');
        return tgEdit(cq.message.message_id, `📢 <b>BROADCAST</b>\n\nUser အားလုံးဆီ ပို့မယ့် စာ ရိုက်ပါ\n\n<i>Cancel ရန် /cancel</i>`, [[{text:'🏠 Menu', callback_data:'menu|start'}]]);
      }
    }
    if (kind === 'dep') {
      const action = parts[1], id = parts.slice(2).join('|');
      const dep = db.deposits.find(d => d.id === id);
      if (!dep) return tgAnswer(cq.id, '❌ မတွေ့', true);
      if (dep.status !== 'pending') return tgAnswer(cq.id, '⚠️ ပြီးသား', true);
      if (action === 'approve') {
        const user = db.users.find(x => x.id === dep.userId);
        if (!user) return tgAnswer(cq.id, '❌ User မတွေ့', true);
        user.balance += dep.amount;
        dep.status = 'approved'; dep.approvedAt = Date.now(); dep.approvedBy = 'telegram';
        saveDb();
        if (user.telegramId) await tgSendTo(user.telegramId, `✅ <b>+${dep.amount.toLocaleString()} Ks</b>\n💰 New Balance: ${user.balance.toLocaleString()} Ks`, USER_MAIN);
        await tgEdit(cq.message.message_id, `✅ <b>APPROVED</b>\n\n👤 ${dep.username}\n💵 +${dep.amount.toLocaleString()} Ks\n💰 New: ${user.balance.toLocaleString()} Ks`, [[{text:'📊 Pending', callback_data:'menu|pending'}]]);
        return tgAnswer(cq.id, '✅');
      }
      if (action === 'reject') {
        dep.status = 'rejected'; dep.rejectedBy = 'telegram'; saveDb();
        const u2 = db.users.find(x => x.id === dep.userId);
        if (u2 && u2.telegramId) await tgSendTo(u2.telegramId, `❌ <b>Deposit Rejected</b>\n\n💵 ${dep.amount.toLocaleString()} Ks`, USER_MAIN);
        await tgEdit(cq.message.message_id, `❌ <b>REJECTED</b>\n\n👤 ${dep.username}\n💵 ${dep.amount.toLocaleString()} Ks`, [[{text:'📊 Pending', callback_data:'menu|pending'}]]);
        return tgAnswer(cq.id, '❌');
      }
    }
    if (kind === 'ord') {
      const action = parts[1], id = parts.slice(2).join('|');
      const o = db.orders.find(x => x.id === id);
      if (!o) return tgAnswer(cq.id, '❌ မတွေ့', true);
      if (o.status === action) return tgAnswer(cq.id, '⚠️', true);
      if (action === 'rejected' && o.status !== 'rejected') {
        const u2 = db.users.find(x => x.id === o.userId);
        if (u2) u2.balance += o.price;
      }
      o.status = action; o.updatedAt = Date.now(); saveDb();
      const emoji = {processing:'⚙️', completed:'✅', rejected:'❌'}[action] || 'ℹ️';
      const u3 = db.users.find(x => x.id === o.userId);
      if (u3 && u3.telegramId) {
        await tgSendTo(u3.telegramId, `${emoji} <b>Order ${action.toUpperCase()}</b>\n\n🎮 ${o.game} — ${o.product}\n🔖 <code>${o.id}</code>`, USER_MAIN);
      }
      await tgEdit(cq.message.message_id, `${emoji} <b>ORDER ${action.toUpperCase()}</b>\n\n👤 ${o.username}\n🎮 ${o.game} — ${o.product}\n💵 ${o.price.toLocaleString()} Ks`, orderKeyboard(o.id, o.status));
      return tgAnswer(cq.id, emoji + ' ' + action);
    }
    return tgAnswer(cq.id, '❓');
  }

  const msg = u.message;
  if (!msg) return;

  // Broadcast step
  const state = userStates[chatId] || {};
  if (state.adminStep === 'wait_broadcast' && msg.text) {
    delete userStates[chatId];
    if (msg.text === '/cancel') return tgSend('❌ Cancel', ADMIN_MAIN);
    let count = 0;
    db.users.forEach(u => {
      db.chats.push({ id:'C'+Date.now()+Math.random().toString(36).slice(2,5), userId:u.id,
        username:u.username, from:'admin', text:`📢 ${msg.text}`, createdAt:Date.now(), read:false });
      count++;
    });
    saveDb();
    return tgSend(`✅ <b>Broadcast ပြီးပါပြီ</b>\n\n📢 ${count} ယောက်ဆီ ပို့ပြီးပါပြီ`, ADMIN_MAIN);
  }

  if (!msg.text) return;
  const cmd = msg.text.trim().split(' ')[0].toLowerCase();
  if (cmd === '/start' || cmd === '/help' || cmd === '/menu') {
    return tgSend(`${HEADER_ADMIN}\n\n<b>Admin Bot</b>\n\n/pending\n/stats\n/users\n/chats\n/broadcast\n/faq`, ADMIN_MAIN);
  }
  if (cmd === '/pending') return showPending(chatId);
  if (cmd === '/stats') return showStats(chatId);
  if (cmd === '/users') return showUsers(chatId);
  if (cmd === '/chats') return showChats(chatId);
  if (cmd === '/faq') return tgSend(FAQ_TEXT, [[{text:'🏠 Menu', callback_data:'menu|start'}]]);
  if (cmd === '/broadcast') { userStates[chatId] = { adminStep: 'wait_broadcast' }; return tgSend('📢 Broadcast စာ ရိုက်ပါ\n\nCancel: /cancel'); }
}

async function showPending(chatId) {
  const db = getDb(); const token = db.config.telegramBotToken;
  const pendingDeps = db.deposits.filter(d => d.status === 'pending');
  const pendingOrds = db.orders.filter(o => o.status === 'pending' || o.status === 'processing');
  if (!pendingDeps.length && !pendingOrds.length) {
    return tgApi('sendMessage', { chat_id: chatId, text: `🎉 <b>Pending မရှိပါ</b>`, reply_markup:{inline_keyboard:[[{text:'🏠 Menu', callback_data:'menu|start'}]]} }, token);
  }
  await tgApi('sendMessage', { chat_id: chatId, text: `📊 <b>PENDING</b>\n\n${LINE}\n💰 Deposits: <b>${pendingDeps.length}</b>\n🎮 Orders: <b>${pendingOrds.length}</b>`, parse_mode:'HTML' }, token);
  for (const d of pendingDeps.slice(0, 10)) {
    await tgApi('sendMessage', { chat_id: chatId, text: depositCard(d), parse_mode:'HTML', reply_markup:{inline_keyboard: depositKeyboard(d.id, d.status)} }, token);
  }
  for (const o of pendingOrds.slice(0, 10)) {
    await tgApi('sendMessage', { chat_id: chatId, text: orderCard(o), parse_mode:'HTML', reply_markup:{inline_keyboard: orderKeyboard(o.id, o.status)} }, token);
  }
}
async function showStats(chatId) {
  const db = getDb(); const token = db.config.telegramBotToken;
  const ts = new Date(); ts.setHours(0,0,0,0); const t = ts.getTime();
  const totalRevenue = db.orders.filter(o => o.status === 'completed').reduce((s,o)=>s+o.price,0);
  const todayRevenue = db.orders.filter(o => o.status === 'completed' && o.createdAt >= t).reduce((s,o)=>s+o.price,0);
  return tgApi('sendMessage', { chat_id: chatId,
    text: `📊 <b>STATISTICS</b>\n\n👥 Users: <b>${db.users.length}</b>\n📦 Orders: <b>${db.orders.length}</b>\n💰 Revenue: <b>${totalRevenue.toLocaleString()} Ks</b>\n📅 Today: <b>${todayRevenue.toLocaleString()} Ks</b>\n⏳ Pending: <b>${db.deposits.filter(d=>d.status==='pending').length}</b>`,
    parse_mode:'HTML', reply_markup:{inline_keyboard: ADMIN_MAIN} }, token);
}
async function showUsers(chatId) {
  const db = getDb(); const token = db.config.telegramBotToken;
  const users = [...db.users].sort((a,b) => b.createdAt - a.createdAt).slice(0, 10);
  const lines = users.map((u,i) => `${i+1}. <b>${u.username}</b> ${u.telegramId?'🔗':''}\n    💰 ${u.balance.toLocaleString()} Ks`).join('\n\n');
  return tgApi('sendMessage', { chat_id: chatId, text: `👥 <b>RECENT USERS</b>\n\n${lines}`, parse_mode:'HTML', reply_markup:{inline_keyboard: ADMIN_MAIN} }, token);
}
async function showChats(chatId) {
  const db = getDb(); const token = db.config.telegramBotToken;
  const map = {};
  db.chats.forEach(c => {
    if (!map[c.userId]) map[c.userId] = { username:c.username, last:c, unread:0 };
    if (c.createdAt > map[c.userId].last.createdAt) map[c.userId].last = c;
    if (c.from === 'user' && !c.read) map[c.userId].unread++;
  });
  const list = Object.values(map).slice(0, 10);
  const lines = list.map(c => `<b>${c.username}</b>${c.unread?` 🔴 ${c.unread}`:''}\n<i>${String(c.last.text).slice(0,40)}</i>`).join('\n\n');
  return tgApi('sendMessage', { chat_id: chatId, text: `💬 <b>CHATS</b>\n\n${lines || 'မရှိပါ'}`, parse_mode:'HTML', reply_markup:{inline_keyboard: ADMIN_MAIN} }, token);
}

async function handleUpdate(u) {
  const db = getDb();
  const adminId = String(db.config.telegramChatId || '');
  let chatId = null;
  if (u.callback_query) chatId = String(u.callback_query.message.chat.id);
  else if (u.message) chatId = String(u.message.chat.id);
  if (!chatId) return;
  if (chatId === adminId && adminId) return handleAdminFlow(chatId, u, db);
  return handleUserFlow(chatId, u, db);
}

async function notifyDeposit(dep) {
  const db = getDb();
  const { telegramBotToken, telegramChatId } = db.config;
  if (!telegramBotToken || !telegramChatId) return;
  await tgApi('sendMessage', { chat_id: telegramChatId,
    text: `🔔 <b>NEW DEPOSIT</b>\n\n` + depositCard(dep), parse_mode:'HTML',
    reply_markup:{inline_keyboard: depositKeyboard(dep.id, dep.status)} }, telegramBotToken);
}
async function notifyOrder(order) {
  const db = getDb();
  const { telegramBotToken, telegramChatId } = db.config;
  if (!telegramBotToken || !telegramChatId) return;
  await tgApi('sendMessage', { chat_id: telegramChatId,
    text: `🔔 <b>NEW ORDER</b>\n\n` + orderCard(order), parse_mode:'HTML',
    reply_markup:{inline_keyboard: orderKeyboard(order.id, order.status)} }, telegramBotToken);
}
async function notifyChat(user, text) {
  const db = getDb();
  const { telegramBotToken, telegramChatId } = db.config;
  if (!telegramBotToken || !telegramChatId) return;
  await tgApi('sendMessage', { chat_id: telegramChatId,
    text: `💬 <b>${user.username}</b>\n\n<i>"${String(text).slice(0,200)}"</i>`, parse_mode:'HTML' }, telegramBotToken);
}
async function notifyUser(user, text) {
  if (!user.telegramId) return;
  const db = getDb();
  if (!db.config.telegramBotToken) return;
  await tgSendTo(user.telegramId, `💬 <b>Admin Reply</b>\n\n${LINE}\n<i>${text}</i>\n${LINE}`, USER_MAIN);
}
async function sendOTP(telegramId, code) {
  const db = getDb();
  if (!db.config.telegramBotToken) return;
  await tgSendTo(telegramId,
`🔐 <b>Safe Zone OTP</b>\n\n${LINE}\n   Code: <code>${code}</code>\n   ⏱ ၅ မိနစ် သက်တမ်း\n${LINE}\n\n<i>ဒီ code ကို လူမပြောပါနဲ့</i>`);
}

async function pollLoop() {
  if (running) return;
  running = true;
  while (true) {
    const db = getDb();
    const token = db.config.telegramBotToken;
    if (!token) { await sleep(5000); continue; }
    try {
      const r = await tgApi('getUpdates', { offset: botOffset + 1, timeout: 25 }, token);
      if (r && r.ok) {
        for (const u of r.result) {
          botOffset = Math.max(botOffset, u.update_id);
          try { await handleUpdate(u); } catch(e){ console.log('update err:', e.message); }
        }
      } else { await sleep(3000); }
    } catch(e) { await sleep(3000); }
  }
}
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

module.exports = function initBot(opts) {
  getDb = opts.getDb; saveDb = opts.saveDb;
  pollLoop();
  return { notifyDeposit, notifyOrder, notifyChat, notifyUser, sendOTP };
};
