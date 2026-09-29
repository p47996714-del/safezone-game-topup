const ADMIN_USERNAME = 'pyae_phyo_12327';

const FAQ_DB = [
  // ငွေဖြည့်ခြင်း
  { k: ['ငွေဖြည့်', 'ငွေဖြည့်နည်း', 'deposit', 'ငွေထည့်', 'balance ဖြည့်', 'ငွေလွှဲ'],
    a: `💰 *ငွေဖြည့်နည်း*\n\n၁။ Mini App ဖွင့်ပါ\n၂။ 📥 Deposit ကို နှိပ်ပါ\n၃။ ပမာဏ ထည့်ပါ (အနည်းဆုံး 500 MMK)\n၄။ ဘဏ် ရွေးပါ (KBZ/Wave/UAB/AYA)\n၅။ ငွေလွှဲပြီး ပြေစာပုံ တင်ပါ\n၆။ Admin Approve လုပ်တာနဲ့ Balance ရောက်ပါမယ်\n\n⏱ အတည်ပြုချိန်: ၅ မိနစ် ~ ၁ နာရီ` },
  { k: ['အနည်းဆုံး', 'minimum', 'min deposit'],
    a: `📊 *အနည်းဆုံး ငွေဖြည့်ပမာဏ*\n\n💰 500 MMK မှစပြီး ဖြည့်လို့ရပါသည်။` },
  { k: ['ငွေလွှဲနည်း', 'payment', 'ဘဏ်', 'bank'],
    a: `🏦 *ငွေလွှဲနည်း*\n\n၁။ KBZ Bank\n၂။ Wave Money\n၃။ UAB Bank\n၄။ AYA Bank\n\n📌 Deposit ဖွင့်တဲ့အခါ ငွေလွှဲရမယ့် အကောင့်နံပါတ် ပြပါမယ်။` },
  { k: ['ငွေမရ', 'balance မရ', 'ငွေမဝင်', 'deposit မရ', 'approve မလုပ်'],
    a: `⏳ *ငွေမရသေးရင်*\n\n၁။ ၅ မိနစ်ခန့် စောင့်ပါ\n၂။ Admin ကို @${ADMIN_USERNAME} ဆက်သွယ်ပါ\n၃။ Deposit ID ကို ပြောပါ` },

  // Order ဝယ်ယူခြင်း
  { k: ['ဝယ်နည်း', 'order', 'ဘယ်လိုဝယ်', 'purchase'],
    a: `🛒 *ဝယ်ယူနည်း*\n\n၁။ Mini App ဖွင့်ပါ\n၂။ ဂိမ်း ရွေးပါ\n၃။ Item ရွေးပါ\n၄။ Game ID + Server ID ထည့်ပါ\n၅။ "ဝယ်မယ်" နှိပ်ပါ\n၆။ Admin က ဆောင်ရွက်ပြီး ပြန်ပို့ပါမယ်` },
  { k: ['order မရ', 'order ကြာ', 'order မရောက်'],
    a: `📦 *Order ကြာချိန်*\n\n• Manual Order — ၅ မိနစ် ~ ၁ နာရီ\n• Auto Delivery — ၅ စက္ကန့်အတွင်း\n\n📍 Track: Mini App → History → Order` },
  { k: ['game id', 'server id', 'id ထည့်နည်း'],
    a: `🎮 *Game ID / Server ID ရှာနည်း*\n\n📱 MLBB: Profile ကို နှိပ်ပါ → ID (Server) တွေ့ရမည်\n🎮 PUBG: Profile → ID ကို ကူးပါ\n\n⚠️ ID မှားထည့်ရင် Refund ရနိုင်ပါသည်။` },
  { k: ['refund', 'ငွေပြန်အမ်း', 'ပြန်အမ်း'],
    a: `💸 *Refund*\n\nRefund ရနိုင်တဲ့ အခြေအနေများ:\n• Admin က Order မဆောင်ရွက်နိုင်ခဲ့ရင်\n• Item မရနိုင်တဲ့အခါ\n• Duplicate Order ဖြစ်ရင်\n\n📞 @${ADMIN_USERNAME} ဆက်သွယ်ပါ။` },

  // Balance / Account
  { k: ['balance', 'ငွေလက်ကျန်', 'လက်ကျန်'],
    a: `💰 *Balance စစ်နည်း*\n\n၁။ Bot မှာ "💰 Balance" နှိပ်ပါ\n၂။ Mini App ထဲမှာ ကြည့်ပါ` },
  { k: ['password မေ့', 'စကားဝှက်မေ့', 'login မရ', 'ဝင်မရ'],
    a: `🔐 *Password မေ့သွားရင်*\n\n@${ADMIN_USERNAME} ကို ဆက်သွယ်ပါ။\nဖုန်းနံပါတ် ပို့ပြီး Reset လုပ်ခိုင်းပါ။` },
  { k: ['account ဖွင့်', 'register', 'အကောင့်ဖွင့်'],
    a: `📝 *အကောင့်ဖွင့်နည်း*\n\n၁။ Telegram Bot ကို ဖွင့်ပါ\n၂။ Mini App ကို နှိပ်ပါ\n၃။ Register ကို နှိပ်ပါ\n၄။ နာမည် + ဖုန်း + Password ထည့်ပါ` },

  // ဂိမ်းများ
  { k: ['mlbb', 'mobile legends', 'diamond', 'diamonds'],
    a: `💎 *Mobile Legends Topup*\n\n• Diamonds (86 ~ 9288)\n• Weekly Pass\n• Twilight Pass\n• Double Diamonds\n\n⏱ ပို့ချိန်: ၅ ~ ၃၀ မိနစ်` },
  { k: ['pubg', 'uc'],
    a: `🎮 *PUBG Mobile Topup*\n\n• UC (60 ~ 8100)\n• Elite Pass\n• Prime / Prime Plus\n• Growth Pack\n\n⏱ ပို့ချိန်: ၅ ~ ၃၀ မိနစ်` },
  { k: ['app premium', 'telegram premium', 'tg premium'],
    a: `⭐ *App Premium*\n\n• Telegram Premium (1/3/6/12 လ)\n• ChatGPT Plus\n• Gemini\n• CapCut Pro\n• Canva Pro\n\n⚡ Auto Delivery — ၅ စက္ကန့်အတွင်း` },

  // Features
  { k: ['points', 'ပွိုင့်', 'loyalty'],
    a: `⭐ *Loyalty Points*\n\n💰 ရနည်း: ဝယ်တိုင်း 1,000 Ks = 10 Points\n💸 လဲနည်း: 100 Points = 1,000 Ks\n\n📱 Mini App → Dashboard → ⭐ Points` },
  { k: ['referral', 'ဖိတ်ခေါ်', 'invite'],
    a: `🎁 *Referral System*\n\n၁။ Mini App → 🎁 Referral\n၂။ Code ကို Copy လုပ်ပါ\n၃။ သူငယ်ချင်းကို ပို့ပါ\n၄။ သူတို့ Register လုပ်ရင် နှစ်ယောက်လုံး Bonus ရ!\n\n💰 Bonus: 500 Ks (နှစ်ယောက်လုံး)` },
  { k: ['spin', 'lucky spin', 'ကံစမ်း', 'လှည့်'],
    a: `🎰 *Lucky Spin*\n\nကစားနည်း:\n• Mini App → 🎰 Spin\n• "SPIN လှည့်မယ်" နှိပ်ပါ\n\n🎁 ရနိုင်တဲ့ ဆုများ:\n100, 200, 300, 500, 1,000, 2,000, 5,000 Ks\n\n💡 ဝယ်ယူတိုင်း Spin အခွင့်အရေး ၁ ခါ ရပါသည်။` },
  { k: ['promo', 'promo code', 'ပရိုမို'],
    a: `🎟️ *Promo Code*\n\n၁။ Mini App → 🎟️ Promo Code\n၂။ Code ရိုက်ထည့်ပါ\n၃။ Redeem နှိပ်ပါ\n\n📢 Promo Code အသစ်တွေ ရရင် Bot က အသိပေးပါမယ်။` },
  { k: ['auto delivery', 'auto', 'အလိုအလျောက်', 'instant'],
    a: `⚡ *Auto Delivery*\n\nအလိုအလျောက် ပို့တဲ့ Items:\n• Telegram Premium, ChatGPT Plus\n• Gemini, CapCut Pro, Canva Pro\n\n⏱ ၅ စက္ကန့်အတွင်း ပို့ပါသည်။` },

  // ဆက်သွယ်ရေး
  { k: ['admin', 'ဆက်သွယ်', 'contact'],
    a: `📞 *Admin ဆက်သွယ်ရန်*\n\n👤 @${ADMIN_USERNAME}\n💬 Chat: Mini App ထဲမှာ\n\n⏰ ဖွင့်ချိန်: မနက် ၉:၀၀ ~ ည ၁၁:၀၀` },
  { k: ['chat', 'စကားပြော', 'message'],
    a: `💬 *Chat လုပ်နည်း*\n\nMini App → 💬 Chat → စာ ရိုက်ပြီး ပို့ပါ\n\n📷 ဓာတ်ပုံ ပို့လို့ရပါတယ်။` },
  { k: ['help', 'အကူအညီ', 'ကူညီ', 'support'],
    a: `🆘 *အကူအညီ*\n\n• Bot မှာ ရိုက်ထည့်ပါ (FAQ Auto ဖြေမယ်)\n• Mini App → 💬 Chat\n• @${ADMIN_USERNAME} တိုက်ရိုက်` },
  { k: ['ဈေးနှုန်း', 'price', 'ဘယ်လောက်လဲ'],
    a: `💰 *ဈေးနှုန်းများ*\n\n🎮 Game Topup — 4,000 Ks မှစ၍\n⭐ App Premium — 5,000 Ks မှစ၍\n\n📱 Item တစ်ခုချင်း ကြည့်ဖို့ Mini App ဖွင့်ပါ။` },
  { k: ['bonus', 'ဘောနပ်'],
    a: `🎁 *Bonus ရနိုင်တဲ့ နည်းလမ်းများ*\n\n၁။ 🎁 Referral — 500 Ks (နှစ်ယောက်လုံး)\n၂။ ⭐ Points — ဝယ်တိုင်း Points\n၃။ 🎰 Spin — ဝယ်တိုင်း ၁ ခါ\n၄။ 🎟️ Promo Code` },
  { k: ['ဘယ်တော့ဖွင့်', 'open hours', 'ဖွင့်ချိန်'],
    a: `⏰ *ဆိုင်ဖွင့်ချိန်*\n\n🟢 ဖွင့်: မနက် ၉:၀၀\n🔴 ပိတ်: ည ၁၁:၀၀\n\n🎰 Auto Delivery Item တွေ ၂၄ နာရီ ရပါတယ်။` },
  { k: ['thanks', 'ကျေးဇူး'],
    a: `🙏 ကျေးဇူးတင်ပါတယ်!\n\n💚 Safe Zone Game Topup ကို ယုံကြည်ပြီး ဝယ်ယူပေးတဲ့အတွက် ကျေးဇူးတင်ပါတယ်။` },
  { k: ['hello', 'hi', 'မင်္ဂလာပါ', 'ဟယ်လို'],
    a: `👋 မင်္ဂလာပါ!\n\n🛍️ Safe Zone Game Topup မှ ကြိုဆိုပါတယ်။\n\n💡 အောက်ပါတို့ကို ရိုက်ပြီး မေးနိုင်ပါတယ်:\n• "ငွေဖြည့်"\n• "ဝယ်နည်း"\n• "points"\n• "referral"\n• "spin"\n• "admin"` }
];

function normalizeText(text) {
  return String(text || '').toLowerCase().trim().replace(/[။၊,.!?]/g, '').replace(/\s+/g, ' ');
}

function findAnswer(text) {
  const norm = normalizeText(text);
  if (!norm) return null;
  for (const faq of FAQ_DB) {
    for (const keyword of faq.k) {
      if (norm.includes(normalizeText(keyword))) return faq.a;
    }
  }
  const words = norm.split(' ').filter(w => w.length >= 2);
  let bestMatch = null, bestScore = 0;
  for (const faq of FAQ_DB) {
    let score = 0;
    for (const keyword of faq.k) {
      const kNorm = normalizeText(keyword);
      for (const word of words) {
        if (kNorm.includes(word) || word.includes(kNorm)) score++;
      }
    }
    if (score > bestScore) { bestScore = score; bestMatch = faq; }
  }
  if (bestMatch && bestScore >= 1) return bestMatch.a;
  return null;
}

module.exports = { FAQ_DB, findAnswer, normalizeText };
