// ===============================
// FAQ DATABASE — Safe Zone Game Topup
// ===============================

const FAQ_DB = [
  // ============ ၁။ ငွေဖြည့်ခြင်း ============
  {
    k: ['ငွေဖြည့်', 'ငွေဖြည့်နည်း', 'deposit', 'ငွေထည့်', 'balance ဖြည့်', 'ငွေလွှဲ', 'ငွေသွင်း'],
    a: `💰 *ငွေဖြည့်နည်း*\n\n၁။ Mini App ဖွင့်ပါ\n၂။ 📥 Deposit ကို နှိပ်ပါ\n၃။ ပမာဏ ထည့်ပါ (အနည်းဆုံး 500 MMK)\n၄။ ဘဏ် ရွေးပါ (KBZ/Wave/UAB/AYA)\n၅။ ငွေလွှဲပြီး ပြေစာပုံ တင်ပါ\n၆။ Admin Approve လုပ်တာနဲ့ Balance ရောက်ပါမယ်\n\n⏱ အတည်ပြုချိန်: ၅ မိနစ် ~ ၁ နာရီ`
  },
  {
    k: ['အနည်းဆုံး', 'minimum', 'အနည်းဆုံးငွေ', 'ငွေအနည်းဆုံး', 'min deposit'],
    a: `📊 *အနည်းဆုံး ငွေဖြည့်ပမာဏ*\n\n💰 500 MMK မှစပြီး ဖြည့်လို့ရပါသည်။\n\n💡 အကြံပြုချက်:\n• 1,000 MMK — အစမ်းသုံး\n• 5,000 MMK — အသုံးများ\n• 10,000 MMK — Bonus ရနိုင်`
  },
  {
    k: ['ငွေလွှဲနည်း', 'ဘယ်လိုလွှဲ', 'ငွေလွှဲ', 'payment', 'ဘဏ်', 'bank'],
    a: `🏦 *ငွေလွှဲနည်း*\n\nအောက်ပါ နည်းလမ်းများဖြင့် လွှဲနိုင်ပါသည် -\n\n၁။ KBZ Bank\n၂။ Wave Money\n၃။ UAB Bank\n၄။ AYA Bank\n\n📌 Deposit ဖွင့်တဲ့အခါ ငွေလွှဲရမယ့် အကောင့်နံပါတ် ပြပါမယ်။\n\n⚠️ ငွေလွှဲပြီး ပြေစာပုံ တင်ဖို့ မမေ့ပါနဲ့။`
  },
  {
    k: ['ငွေမရ', 'balance မရ', 'ငွေမဝင်', 'deposit မရ', 'approve မလုပ်', 'ငွေမတက်'],
    a: `⏳ *ငွေမရသေးရင်*\n\n၁။ ၅ မိနစ်ခန့် စောင့်ပါ (Admin Approve လုပ်ရမည်)\n၂။ Admin ကို @@pyae_phyo_12327 ဆက်သွယ်ပါ\n၃။ Deposit ID ကို ပြောပါ\n\n⏰ Admin အားလပ်ချိန်: မနက် ၉ နာရီ ~ ည ၁၁ နာရီ`
  },
  {
    k: ['ငွေဖြည့်ပြီးရင်', 'approve ဘယ်လောက်ကြာ', 'deposit ကြာချိန်', 'approve time'],
    a: `⏱ *Approve ကြာချိန်*\n\n• Admin Online ရင် — ၅ မိနစ်အတွင်း\n• Admin Busy ရင် — ၁ နာရီအတွင်း\n• ညပိုင်း — မနက်ရောက်မှ\n\n📞 အလောသုံးဆယ်ဆိုရင် @@pyae_phyo_12327 ကို တိုက်ရိုက် ဆက်သွယ်ပါ။`
  },

  // ============ ၂။ Order နှင့် ဝယ်ယူခြင်း ============
  {
    k: ['ဝယ်နည်း', 'order', 'ဘယ်လိုဝယ်', 'purchase', 'topup နည်း'],
    a: `🛒 *ဝယ်ယူနည်း*\n\n၁။ Mini App ဖွင့်ပါ\n၂။ ဂိမ်း ရွေးပါ\n၃။ ဝယ်ချင်တဲ့ Item ရွေးပါ\n၄။ Game ID + Server ID ထည့်ပါ\n၅။ "ဝယ်မယ်" နှိပ်ပါ\n၆။ Admin က ဆောင်ရွက်ပြီး ပြန်ပို့ပါမယ်\n\n⏱ ပုံမှန်အားဖြင့် ၅-၃၀ မိနစ်`
  },
  {
    k: ['order မရ', 'order ကြာ', 'order မရောက်', 'order ဘယ်လောက်ကြာ', 'order tracking'],
    a: `📦 *Order ဘယ်လောက်ကြာမလဲ?*\n\n• Manual Order — ၅ မိနစ် ~ ၁ နာရီ\n• Auto Delivery — ၅ စက္ကန့်အတွင်း\n\n📍 Track ကြည့်နည်း:\nMini App → History → Order → နှိပ်ကြည့်ပါ\n\n❓ မရသေးရင် Order ID နဲ့ Admin ကို ဆက်သွယ်ပါ။`
  },
  {
    k: ['game id', 'server id', 'id ထည့်နည်း', 'game account'],
    a: `🎮 *Game ID / Server ID ရှာနည်း*\n\n📱 *MLBB:*\n• Profile ကို နှိပ်ပါ\n• ID နဲ့ Server ကို ဘေးတွင် တွေ့ရမည်\n• ဥပမာ: ID 12345678 (1234)\n\n🎮 *PUBG:*\n• Profile → ID ကို ကူးပါ\n\n⚠️ ID မှားထည့်ရင် Refund ရနိုင်ပါသည်။`
  },
  {
    k: ['id မှား', 'wrong id', 'id မှားထည့်', 'မှားထည့်'],
    a: `⚠️ *ID မှားထည့်မိရင်*\n\n၁။ ချက်ချင်း Admin ကို ဆက်သွယ်ပါ\n၂။ Order ID ကို ပြောပါ\n၃။ မှန်တဲ့ ID ကို ပို့ပါ\n\n❗ Order မပို့ရသေးရင် ပြင်လို့ရပါတယ်။\n❗ ပို့ပြီးသွားရင် Refund ရဖို့ ခက်ပါတယ်။`
  },
  {
    k: ['order cancel', 'order ပယ်', 'cancel', 'မလုပ်တော့', 'ပယ်ဖျက်'],
    a: `❌ *Order ပယ်ဖျက်ခြင်း*\n\nOrder မဆောင်ရွက်ရသေးရင် ပယ်လို့ရပါတယ်။\n\n၁။ Admin ကို ဆက်သွယ်ပါ\n၂။ Order ID ပို့ပါ\n၃။ Admin က Refund ပြန်ပေးပါမယ်\n\n⚠️ Order ဆောင်ရွက်ပြီးသွားရင် ပယ်လို့မရပါ။`
  },
  {
    k: ['refund', 'ငွေပြန်အမ်း', 'ပြန်အမ်း', 'ငွေပြန်'],
    a: `💸 *Refund (ငွေပြန်အမ်း)*\n\nRefund ရနိုင်တဲ့ အခြေအနေများ:\n• Admin က Order မဆောင်ရွက်နိုင်ခဲ့ရင်\n• Item မရနိုင်တဲ့အခါ\n• Duplicate Order ဖြစ်ရင်\n\n📞 Admin ကို ဆက်သွယ်ပြီး Order ID ပို့ပါ။\n\n⏱ Refund: ၅ မိနစ် ~ ၁ နာရီ`
  },

  // ============ ၃။ Balance နှင့် Account ============
  {
    k: ['balance', 'ငွေလက်ကျန်', 'လက်ကျန်', 'ငွေကျန်'],
    a: `💰 *Balance စစ်နည်း*\n\n၁။ Bot မှာ "💰 Balance" နှိပ်ပါ\n၂။ ဒါမှမဟုတ် Mini App ထဲမှာ ကြည့်ပါ\n၃။ "💰 Balance" လို့ ရိုက်လည်း ရပါတယ်\n\n💡 Balance ကို ဘယ်တော့မှ ဖျက်လို့မရပါ။`
  },
  {
    k: ['password မေ့', 'စကားဝှက်မေ့', 'forgot password', 'login မရ', 'ဝင်မရ'],
    a: `🔐 *Password မေ့သွားရင်*\n\n၁။ Admin ကို @@pyae_phyo_12327 ဆက်သွယ်ပါ\n၂။ ဖုန်းနံပါတ် ပို့ပါ\n၃။ Admin က Reset လုပ်ပေးပါမယ်\n\n⚠️ လုံခြုံရေးအတွက် ကိုယ်တိုင် ပြောင်းပါ။`
  },
  {
    k: ['account ဖွင့်', 'register', 'အကောင့်ဖွင့်', 'sign up', 'စာရင်းသွင်း'],
    a: `📝 *အကောင့်ဖွင့်နည်း*\n\n၁။ Telegram Bot ကို ဖွင့်ပါ\n၂။ Mini App ကို နှိပ်ပါ\n၃။ Register ကို နှိပ်ပါ\n၄။ နာမည် + ဖုန်း + Password ထည့်ပါ\n၅။ Register ပြီးရင် Login ဝင်ပါ\n\n🎁 Referral Code ရှိရင် Bonus ရနိုင်ပါတယ်။`
  },
  {
    k: ['account မရ', 'login မရ', 'register မရ', 'ဝင်လို့မရ'],
    a: `⚠️ *Login / Register မရရင်*\n\n• ဖုန်းနံပါတ် မှန်ရဲ့လား စစ်ပါ\n• Password ၄ လုံးအထက် ရှိရဲ့လား စစ်ပါ\n• Telegram အကောင့် register ပြီးသားလား စစ်ပါ\n• Internet ကောင်းရဲ့လား စစ်ပါ\n\n❓ မရသေးရင် Admin ကို ဆက်သွယ်ပါ။`
  },
  {
    k: ['account ဖျက်', 'delete account', 'အကောင့်ဖျက်'],
    a: `🗑️ *Account ဖျက်ခြင်း*\n\nAccount ဖျက်ချင်ရင် Admin ကို တိုက်ရိုက် ဆက်သွယ်ပါ။\n\n⚠️ Account ဖျက်ရင်:\n• Balance အကုန်ပျောက်\n• Order History ပျောက်\n• Points ပျောက်\n\nပြန်လည်ရယူလို့ မရပါ။`
  },

  // ============ ၄။ ဂိမ်းများ ============
  {
    k: ['mlbb', 'mobile legends', 'ml', 'ဒိုင်ယာ', 'diamond', 'diamonds'],
    a: `💎 *Mobile Legends Topup*\n\nရနိုင်တဲ့ Items:\n• Diamonds (86 ~ 9288)\n• Weekly Pass\n• Twilight Pass\n• Double Diamonds\n\n⏱ ပို့ချိန်: ၅ ~ ၃၀ မိနစ်\n🎮 ID + Server ID လိုအပ်သည်`
  },
  {
    k: ['pubg', 'uc', 'pubg mobile', 'ယူစီ'],
    a: `🎮 *PUBG Mobile Topup*\n\nရနိုင်တဲ့ Items:\n• UC (60 ~ 8100)\n• Elite Pass\n• Prime / Prime Plus\n• Growth Pack\n\n⏱ ပို့ချိန်: ၅ ~ ၃၀ မိနစ်\n🆔 Player ID လိုအပ်သည်`
  },
  {
    k: ['magic chess', 'magic chess go go', 'မက်ဂျစ်ချက်'],
    a: `♟️ *Magic Chess Go Go Topup*\n\nရနိုင်တဲ့ Items:\n• Diamonds\n• Weekly Pass\n• Double Diamonds\n\n⏱ ပို့ချိန်: ၅ ~ ၃၀ မိနစ်\n🎮 ID + Server ID လိုအပ်သည်`
  },
  {
    k: ['app premium', 'telegram premium', 'tg premium', 'premium'],
    a: `⭐ *App Premium Topup*\n\nရနိုင်တဲ့ Items:\n• Telegram Premium (1/3/6/12 လ)\n• ChatGPT Plus\n• Gemini\n• CapCut Pro\n• Canva Pro\n\n⚡ Auto Delivery — ၅ စက္ကန့်အတွင်း\n📧 Account ကို Bot ဆီ ရောက်ပါမယ်`
  },
  {
    k: ['telegram premium', 'tg premium'],
    a: `📱 *Telegram Premium*\n\nဈေးနှုန်းများ:\n• 1 Month — 19,500 Ks\n• 3 Months — 59,000 Ks\n• 6 Months — 77,000 Ks\n• 12 Months — 135,000 Ks\n\n⚡ Instant Delivery\n🔐 Password ချက်ချင်းပြောင်းပါ`
  },

  // ============ ၅။ Points, Referral, Spin ============
  {
    k: ['points', 'ပွိုင့်', 'အမှတ်', 'loyalty', 'အမှတ်စု'],
    a: `⭐ *Loyalty Points*\n\n💰 Points ရနည်း:\n• ဝယ်တိုင်း — 1,000 Ks = 10 Points\n\n💸 Point လဲနည်း:\n• 100 Points = 1,000 Ks\n\n📱 Mini App → Dashboard → ⭐ Points\n\n💡 Points 100 ပြည့်ရင် Ks ပြန်လဲလို့ရပါပြီ။`
  },
  {
    k: ['referral', 'ရည်ညွှန်း', 'ဖိတ်ခေါ်', 'ဖိတ်', 'invite'],
    a: `🎁 *Referral System*\n\nဖိတ်ခေါ်နည်း:\n၁။ Mini App → Dashboard → 🎁 Referral\n၂။ သင့် Code ကို Copy လုပ်ပါ\n၃။ သူငယ်ချင်းကို ပို့ပါ\n၄။ သူတို့ Register လုပ်ရင် နှစ်ယောက်လုံး Bonus ရ!\n\n💰 Bonus: 500 Ks (နှစ်ယောက်လုံး)\n📊 Code: REF0001XXXX`
  },
  {
    k: ['spin', 'lucky spin', 'ကံစမ်း', 'လှည့်'],
    a: `🎰 *Lucky Spin*\n\nကစားနည်း:\n၁။ Mini App → Dashboard → 🎰 Spin\n၂။ "SPIN လှည့်မယ်" နှိပ်ပါ\n၃။ Wheel လှည့်ပြီး Reward ရ!\n\n🎁 Rewards:\n100, 200, 300, 500, 1,000, 2,000, 5,000 Ks\n\n⏱ တစ်ရက် ၁ ခါ (အခမဲ့)`
  },
  {
    k: ['promo', 'promo code', 'ပရိုမို', 'ကုဒ်'],
    a: `🎟️ *Promo Code*\n\nအသုံးပြုနည်း:\n၁။ Mini App → Dashboard → 🎟️ Promo Code\n၂။ Code ကို ရိုက်ထည့်ပါ\n၃။ Redeem နှိပ်ပါ\n\n💡 ဥပမာ: WELCOME10, NEWYEAR\n\n📢 Promo Code အသစ်တွေ ရရင် Bot က အသိပေးပါမယ်။`
  },

  // ============ ၆။ Auto-Delivery ============
  {
    k: ['auto delivery', 'auto', 'အလိုအလျောက်', 'instant', 'ချက်ချင်း'],
    a: `⚡ *Auto Delivery*\n\nအလိုအလျောက် ပို့တဲ့ Items:\n• Telegram Premium\n• ChatGPT Plus\n• Gemini\n• CapCut Pro\n• Canva Pro\n\n⏱ ပို့ချိန်: ၅ စက္ကန့်အတွင်း!\n📩 Account ကို Bot ဆီ အလိုအလျောက် ပို့မယ်\n\n💡 App Premium Items တွေမှာ ⚡ Badge ပြနေပါမယ်။`
  },
  {
    k: ['stock ကုန်', 'out of stock', 'မရတော့', 'stock မရှိ'],
    a: `📦 *Stock ကုန်သွားရင်*\n\n⚠️ "လက်ကျန်ကုန်သွားပါပြီ" ဆိုပြီး ပြနေရင် -\n\n၁။ ခဏစောင့်ပါ (Admin ဖြည့်ပေးမယ်)\n၂။ Admin ကို ဆက်သွယ်ပါ\n၃။ Item အခြား ရွေးကြည့်ပါ\n\n⏱ Stock ဖြည့်ချိန်: ၁ ~ ၆ နာရီ`
  },

  // ============ ၇။ ဆက်သွယ်ရေး ============
  {
    k: ['admin', 'ဆက်သွယ်', 'contact', 'admin ဆီ', 'ဖုန်း', 'အဆက်အသွယ်'],
    a: `📞 *Admin ဆက်သွယ်ရန်*\n\n👤 Admin: @@pyae_phyo_12327\n💬 Chat: Mini App ထဲမှာ\n\n⏰ Admin အားလပ်ချိန်:\n• မနက် ၉:၀၀ ~ ည ၁၁:၀၀\n• တနင်္လာ ~ တနင်္ဂနွေ\n\n💡 အားလပ်ချိန်ပြင်ပ စာပို့ထားပါ။ Admin ပြန်ဝင်တာနဲ့ ပြန်ဖြေပါမယ်။`
  },
  {
    k: ['chat', 'စကားပြော', 'message', 'စာ'],
    a: `💬 *Chat လုပ်နည်း*\n\n၁။ Mini App ဖွင့်ပါ\n၂။ 💬 Chat ကို နှိပ်ပါ\n၃။ စာ ရိုက်ပြီး ပို့ပါ\n၄။ Admin ပြန်ဖြေပါမယ်\n\n📷 ဓာတ်ပုံ ပို့လို့ရပါတယ်။\n⏱ Admin ပြန်ဖြေချိန်: ၅ မိနစ် ~ ၁ နာရီ`
  },
  {
    k: ['help', 'အကူအညီ', 'ကူညီ', 'support'],
    a: `🆘 *အကူအညီ*\n\n❓ မေးချင်တာရှိရင်:\n• Bot မှာ ရိုက်ထည့်ပါ (FAQ Auto ဖြေမယ်)\n• Mini App → 💬 Chat\n• @@pyae_phyo_12327 တိုက်ရိုက်\n\n📚 လူကြိုက်များတဲ့ မေးခွန်းများ:\n"ငွေဖြည့်" / "Order" / "Refund" / "Points"`
  },

  // ============ ၈။ အနှံ့အပြား ============
  {
    k: ['ဈေးနှုန်း', 'price', 'ဈေး', 'စျေး', 'ဘယ်လောက်လဲ'],
    a: `💰 *ဈေးနှုန်းများ*\n\n🎮 Game Topup — 4,000 Ks မှစ၍\n⭐ App Premium — 5,000 Ks မှစ၍\n📱 Telegram Premium — 19,500 Ks မှစ၍\n\n📱 Item တစ်ခုချင်း ကြည့်ဖို့:\nMini App → ဂိမ်း ရွေး → Item ကြည့်`
  },
  {
    k: ['လုံခြုံ', 'safe', 'security', 'လုံခြုံရေး'],
    a: `🔐 *လုံခြုံရေး*\n\n✅ သင့်အချက်အလက်များ:\n• Telegram Login နဲ့ ချိတ်ဆက်\n• Password Hash လုပ်ထား\n• Admin ပဲ ကြည့်နိုင်\n\n⚠️ သတိထားရန်:\n• Password ကို ဘယ်သူ့ကိုမှ မပေးပါနဲ့\n• Admin က Password မေးလို့မရပါ\n• Suspicious Link မနှိပ်ပါနဲ့`
  },
  {
    k: ['bonus', 'ဘောနပ်', 'အခမဲ့', 'free'],
    a: `🎁 *Bonus ရနိုင်တဲ့ နည်းလမ်းများ*\n\n၁။ 🎁 Referral — သူငယ်ချင်းဖိတ်ခေါ် (500 Ks နှစ်ယောက်လုံး)\n၂။ ⭐ Loyalty Points — ဝယ်တိုင်း Points ရ\n၃။ 🎰 Lucky Spin — တစ်ရက် ၁ ခါ အခမဲ့\n၄။ 🎟️ Promo Code — Code ရိုက်ထည့်\n\n💡 အားလုံး Mini App Dashboard မှာ ရှိပါတယ်။`
  },
  {
    k: ['ဘယ်တော့ဖွင့်', 'open hours', 'အချိန်', 'ဖွင့်ချိန်', 'ပိတ်ချိန်'],
    a: `⏰ *ဆိုင်ဖွင့်ချိန်*\n\n🟢 ဖွင့်ချိန်: မနက် ၉:၀၀\n🔴 ပိတ်ချိန်: ည ၁၁:၀၀\n\n💡 အချိန်ပြင်ပ စာပို့ထားပါ။\n📩 မနက်ရောက်မှ Admin ပြန်ဖြေပါမယ်။\n\n🎰 Auto Delivery Item တွေ ၂၄ နာရီ ရပါတယ်။`
  },
  {
    k: ['payment approve', 'payment မရ', 'ငွေလွှဲပြီး', 'လွှဲပြီး'],
    a: `💳 *ငွေလွှဲပြီးရင်*\n\n၁။ Deposit မှာ ပြေစာပုံ တင်ပါ\n၂။ Admin ကို Notification ရောက်သွားမယ်\n၃။ Admin Approve လုပ်တာနဲ့ Balance ထဲ ရောက်မယ်\n\n⏱ Approve: ၅ မိနစ် ~ ၁ နာရီ\ṇ\n⚠️ ပြေစာပုံ မတင်ရင် Approve မဖြစ်ပါ။`
  },
  {
    k: ['bot', 'bot မရ', 'bot မဖွင့်', 'bot error'],
    a: `🤖 *Bot အလုပ်မလုပ်ရင်*\n\n၁။ Telegram ကို ပြန် Open လုပ်ပါ\n၂။ /start ကို ပြန်ရိုက်ပါ\n၃။ Mini App ကို ပြန် Refresh လုပ်ပါ\n၄။ Internet Connection ကောင်းရဲ့လား စစ်ပါ\n\n❓ မရသေးရင် @@pyae_phyo_12327 ဆက်သွယ်ပါ။`
  },
  {
    k: ['mini app', 'mini app မရ', 'app မဖွင့်', 'mini app error'],
    a: `📱 *Mini App မဖွင့်ရင်*\n\n၁။ Telegram ကို Update လုပ်ပါ\n၂။ Bot ကို ပြန်ဖွင့်ပါ\n၃။ Mini App Button ကို နှိပ်ပါ\n၄။ Cache ရှင်းပါ\n\n❓ မရသေးရင် Admin ကို ဆက်သွယ်ပါ။`
  },
  {
    k: ['gift', 'ငွေလက်ဆောင်', 'ပို့ချင်', 'transfer'],
    a: `🎁 *ငွေလက်ဆောင် ပို့ချင်ရင်*\n\nလောလောဆယ် Balance လွှဲလို့ မရသေးပါ။\n\n💡 ဒါပေမယ့်:\n• သူငယ်ချင်းရဲ့ Telegram ကနေ သူ့အကောင့် ဖွင့်ပြီး ဝယ်ပေးလို့ ရပါတယ်။\n• ဒါမှမဟုတ် Promo Code ပို့ပေးလို့ ရပါတယ်။`
  },
  {
    k: ['ငွေလွှဲမှား', 'wrong transfer', 'မှားလွှဲ', 'ငွေမှား'],
    a: `⚠️ *ငွေလွှဲမှားသွားရင်*\n\n၁။ ချက်ချင်း Admin ကို ဆက်သွယ်ပါ\n၂။ လွှဲတဲ့ ပြေစာပုံ ပို့ပါ\n၃။ ဘယ်သူ့ဆီ လွှဲမိလဲ ပြောပါ\n\n⚠️ မတူတဲ့သူဆီ ရောက်သွားရင် ပြန်ရဖို့ ခက်ပါတယ်။\n\n✅ ငွေလွှဲတိုင်း အကောင့်နံပါတ် သေချာစစ်ပါ။`
  },
  {
    k: ['order history', 'မှတ်တမ်း', 'history', 'အရင် order'],
    a: `📜 *မှတ်တမ်း ကြည့်နည်း*\n\nMini App → 📜 History\n\nကြည့်လို့ရတာများ:\n• 💳 Transactions (Balance အတိုး/အလျော့)\n• 📥 Deposits (ငွေဖြည့်မှု)\n• 🛒 Orders (ဝယ်ယူမှု)\n\n💡 Order ကို နှိပ်ပြီး Track ကြည့်လို့ရပါတယ်။`
  },
  {
    k: ['id ရှာ', 'id ဘယ်မှာ', 'profile id'],
    a: `🆔 *သင့် ID ရှာနည်း*\n\nMini App → 👤 Profile\n\nကြည့်လို့ရတာများ:\n• 🆔 User ID (#)\n• 🎁 Referral Code\n• 📱 Phone\n• 📅 Register Date`
  },
  {
    k: ['promo code အလကား', 'free promo', 'promo ရ', 'promo code ရနိုင်'],
    a: `🎁 *Promo Code ရနိုင်တဲ့ နည်းလမ်းများ*\n\n၁။ Bot ကို အသိပေးစာ ပို့တဲ့အခါ ကြည့်ပါ\n၂။ Admin ကို ဆက်သွယ်မေးပါ\n၃။ ပွဲလမ်းသဘင်တွေမှာ ရနိုင်ပါတယ်\n\n💡 ဥပမာ Code များ:\n• WELCOME10\n• NEWYEAR\n• SPECIAL50`
  },
  {
    k: ['ငွေဖြည့် limit', 'limit', 'အကန့်အသတ်'],
    a: `📊 *ငွေဖြည့် အကန့်အသတ်*\n\n📉 အနည်းဆုံး: 500 MMK\n📈 အများဆုံး: 1,000,000 MMK (တစ်ခါ)\n\n💡 ပိုပြီး ဖြည့်ချင်ရင် Admin ကို ဆက်သွယ်ပါ။`
  },
  {
    k: ['ဘယ်အချိန်ပို့', 'delivery time', 'ပို့ချိန်'],
    a: `⏱ *ပို့ချိန်*\n\n⚡ Auto Delivery:\n• Telegram Premium\n• ChatGPT Plus\n• Gemini\n• CapCut Pro\n→ ၅ စက္ကန့် ~ ၁ မိနစ်\n\n🎮 Game Topup (Manual):\n• MLBB / PUBG / Magic Chess\n→ ၅ မိနစ် ~ ၁ နာရီ\n\n🌙 ညပိုင်း: မနက်ရောက်မှ ပို့ပါမယ်။`
  },
  {
    k: ['password ပြောင်း', 'change password'],
    a: `🔐 *Password ပြောင်းနည်း*\n\nလောလောဆယ် App ထဲမှာ တိုက်ရိုက် ပြောင်းလို့ မရသေးပါ။\n\n📞 Admin ကို ဆက်သွယ်ပါ:\n၁။ ဖုန်းနံပါတ် ပို့ပါ\n၂။ Password အသစ် ပြောပါ\n၃။ Admin က ပြောင်းပေးပါမယ်။`
  },
  {
    k: ['ဘယ်ဂိမ်းတွေရ', 'games list', 'ဂိမ်းစာရင်း'],
    a: `🎮 *ရနိုင်တဲ့ ဂိမ်းများ*\n\n၁။ Mobile Legends (MLBB)\n၂။ Magic Chess Go Go\n၃။ PUBG Mobile\n၄။ App Premium (Telegram, ChatGPT, Gemini စသဖြင့်)\n\n💡 နောက်ထပ် ဂိမ်းအသစ်များ ထပ်ထည့်ပါမယ်။`
  },
  {
    k: ['order နံပါတ်', 'order id', 'order id ဘယ်မှာ'],
    a: `🔢 *Order ID ရှာနည်း*\n\nMini App → 📜 History → 🛒 Orders\n\nOrder တစ်ခုချင်းစီမှာ:\n• #ID (Order နံပါတ်)\n• Item နာမည်\n• Status (pending/completed/rejected)\n• Price\n\n📞 Admin ကို ဆက်သွယ်တဲ့အခါ ID ပြောပါ။`
  },
  {
    k: ['တခြားသူ account', 'multiple account', 'account ၂ ခု'],
    a: `👥 *Account အများကြီး ဖွင့်လို့ရလား?*\n\n✅ ရပါတယ်။ ဒါပေမယ့်:\n• Telegram တစ်ခုစီကနေ ဖွင့်ပါ\n• ဖုန်းနံပါတ် တစ်ခုစီ သုံးပါ\n• တူတဲ့ ဖုန်းနံပါတ်နဲ့ ဖွင့်လို့မရပါ\n\n⚠️ Fake account တွေ Ban ခံရနိုင်ပါတယ်။`
  },
  {
    k: ['thanks', 'ကျေးဇူး', 'ကျေးဇူးတင်', 'thank'],
    a: `🙏 ကျေးဇူးတင်ပါတယ်!\n\n💚 Safe Zone Game Topup ကို ယုံကြည်ပြီး ဝယ်ယူပေးတဲ့အတွက် ကျေးဇူးတင်ပါတယ်။\n\n🎁 သူငယ်ချင်းတွေကို Referral Code မျှဝေပြီး Bonus ရယူနိုင်ပါတယ်။\n\n📞 နောက်ထပ် မေးချင်တာရှိရင် ရိုက်ထည့်ပါ။`
  },
  {
    k: ['hello', 'hi', 'မင်္ဂလာပါ', 'ဟယ်လို', 'hey'],
    a: `👋 မင်္ဂလာပါ!\n\n🛍️ Safe Zone Game Topup မှ ကြိုဆိုပါတယ်။\n\n💡 အောက်ပါတို့ကို ရိုက်ပြီး မေးနိုင်ပါတယ်:\n• "ငွေဖြည့်" — Deposit\n• "ဝယ်နည်း" — Purchase\n• "points" — Loyalty\n• "referral" — Referral\n• "spin" — Lucky Spin\n• "admin" — ဆက်သွယ်ရန်`
  },
  {
    k: ['အဆင်ပြေလား', 'ok', 'good', 'nice'],
    a: `✅ ကောင်းပါတယ်!\n\n💚 Safe Zone Game Topup ကို ရွေးချယ်ပေးတဲ့အတွက် ကျေးဇူးတင်ပါတယ်။\n\n❓ နောက်ထပ် မေးချင်တာရှိရင် ရိုက်ထည့်ပါ။`
  }
];

function normalizeText(text) {
  return String(text || '').toLowerCase().trim()
    .replace(/[။၊,.!?]/g, '')
    .replace(/\s+/g, ' ');
}

function findAnswer(text) {
  const norm = normalizeText(text);
  if (!norm) return null;

  // ပထမ Priority — Keyword တိုက်ရိုက် ပါဝင်ရင်
  for (const faq of FAQ_DB) {
    for (const keyword of faq.k) {
      const kNorm = normalizeText(keyword);
      if (norm.includes(kNorm)) return faq.a;
    }
  }

  // ဒုတိယ Priority — အဓိကစကားလုံး ပါဝင်ရင်
  const words = norm.split(' ').filter(w => w.length >= 2);
  let bestMatch = null;
  let bestScore = 0;
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
