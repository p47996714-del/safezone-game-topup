const FAQ_DB = [
  { k: ['ငွေဖြည့်', 'ငွေဖြည့်', 'ဖြည့်', 'deposit', 'topup', 'top up'], a: '💰 *ငွေဖြည့်ရန်*\n\n1️⃣ Mini App ဖွင့်ပါ\n2️⃣ ➕ ငွေဖြည့် နှိပ်ပါ\n3️⃣ ပမာဏ ထည့်ပါ\n4️⃣ KBZ/Wave/UAB/AYA ရွေးပါ\n5️⃣ ပြေစာပုံ တင်ပါ\n6️⃣ Admin approve ရင် Wallet ထဲ ရောက်မယ်' },
  { k: ['ဝယ်', 'ဝယ်ယူ', 'buy', 'purchase'], a: '🛒 *ဝယ်ယူရန်*\n\n1️⃣ Wallet ထဲ ပိုက်ဆံ ရှိရမယ်\n2️⃣ ဂိမ်း ရွေးပါ\n3️⃣ Item ရွေးပါ\n4️⃣ Game ID (MLBB/Magic Chess ဆိုရင် Server ID ပါ) ထည့်ပါ\n5️⃣ Admin က account/item ပို့ပေးမယ်' },
  { k: ['balance', 'လက်ကျန်', 'wallet'], a: '💰 *Balance ကြည့်ရန်*\n\nMini App ရဲ့ ပထမဆုံး screen မှာ ကြည့်နိုင်ပါတယ်။' },
  { k: ['admin', 'ဆက်သွယ်', 'contact'], a: '📞 *Admin ဆက်သွယ်ရန်*\n\n• Mini App → 💬 Admin Chat\n• သို့ @pyae_phyo_12327' },
  { k: ['order', 'အော်ဒါ', 'status', 'မှတ်တမ်း'], a: '🛒 *Order Status ကြည့်ရန်*\n\nMini App → 📜 မှတ်တမ်း → Orders' },
  { k: ['help', 'ကူညီ', 'faq', 'ဘယ်လို'], a: '📚 *FAQ — မေးလို့ရတဲ့ ခေါင်းစဉ်များ*\n\n💰 ငွေဖြည့်\n🛒 ဝယ်ယူ\n💳 Balance\n📞 Admin ဆက်သွယ်\n📜 Order Status\n\nဒါတွေထဲက တစ်ခုကို ရိုက်ပါ' },
  { k: ['password', 'စကားဝှက်', 'forgot', 'မေ့'], a: '🔑 *Password မေ့သွားရင်*\n\nMini App → 👤 အကောင့် → 🚪 ထွက်မယ် → Login ပြန်ပေါ်မယ်\n\n📞 Admin: @pyae_phyo_12327' },
  { k: ['game id', 'server'], a: '🆔 *Game ID ဆိုတာ ဘာလဲ?*\n\n• MLBB → Profile → ID\n• MLBB/Magic Chess → ID + Server ID လိုတယ်\n• PUBG → ID ပဲ' }
];
function findAnswer(text) {
  const lower = (text || '').toLowerCase().trim();
  for (const f of FAQ_DB) {
    for (const kw of f.k) {
      if (lower.includes(kw.toLowerCase())) return f.a;
    }
  }
  return null;
}
module.exports = { FAQ_DB, findAnswer };
