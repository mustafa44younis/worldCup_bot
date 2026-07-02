import 'dotenv/config';

// 🔑 رموز الاتصال (Tokens & Keys)
export const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
export const apiKey = process.env.FOOTBALL_DATA_API_KEY?.trim();

// 👑 معرّف المطور / الأدمن
export const ADMIN_ID = 5403930262;

// ⏳ مؤقت فحص الأهداف والمباريات المباشرة
// 60000 مللي ثانية = دقيقة واحدة (يستهلك طلب واحد فقط في الدقيقة من الـ API، مثالي للخطة المجانية)
export const checkInterval = 60000; 

// 📂 مسارات ملفات الكاش (Cache Files Paths)
export const STANDINGS_CACHE_FILE   = './standings_cache.json';
export const SCORERS_CACHE_FILE     = './scorers_cache.json';
export const ROUND1_CACHE_FILE      = './round1_cache.json';
export const KNOCKOUT_CACHE_FILE    = './cache_knockout_matches.json';

export const MATCHES_TODAY_CACHE     = './cache_matches_today.json';
export const MATCHES_TOMORROW_CACHE  = './cache_matches_tomorrow.json';
export const MATCHES_YESTERDAY_CACHE = './cache_matches_yesterday.json';
export const MATCHES_LIVE_CACHE      = './cache_matches_live.json'; // 🌟 مضاف لحماية دالة البث الحي

// ⏱️ مدد صلاحية الكاش بالمللي ثانية (Cache Expiry Times)
export const CACHE_EXPIRIES = {
  STABLE_DATA: 2 * 60 * 60 * 1000, // ⏰ ساعتين (للترتيب والهدافين والمجموعات لأنها لا تتغير بسرعة)
  DAILY_MATCHES: 10 * 60 * 1000,   // ⏰ 10 دقائق (لمباريات اليوم وأمس وغداً لتحديث الحالات والأوقات)
  LIVE_MATCHES: 45 * 1000          // ⏰ 45 ثانية (للمباريات الجارية حالياً لمنع استهلاك الـ API عند ضغط المستخدمين)
};

// // 🎯 تتبع الأهداف المرسلة لمنع التكرار
// export let sentGoals = new Set();