// index.js
import { Telegraf } from "telegraf";
import axios from "axios";
import fs from "fs";
import moment from "moment-timezone";
import { connectDB } from "./database.js";
import Subscriber from "./models/Subscriber.js";
import { Markup } from "telegraf";
import "dotenv/config";

import http from "http";

// 🌐 إنشاء سيرفر ويب مصغر لإبقاء البوت مستيقظاً على الاستضافات المجانية
const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("🏆 بوت كأس العالم 2026 يعمل بنجاح ومستيقظ دائماً! ⚽");
  })
  .listen(PORT, () => {
    console.log(`🌐 سيرفر الحفاظ على الاستيقاظ يعمل الآن على المنفذ: ${PORT}`);
  });

import {
  botToken,
  apiKey,
  checkInterval,
  STANDINGS_CACHE_FILE,
  SCORERS_CACHE_FILE,
  ROUND1_CACHE_FILE,
  KNOCKOUT_CACHE_FILE,
  ADMIN_ID,
  MATCHES_LIVE_CACHE,
  CACHE_EXPIRIES,
  MATCHES_TODAY_CACHE,
  MATCHES_TOMORROW_CACHE,
  MATCHES_YESTERDAY_CACHE,
} from "./config.js";

import { translateTeam, getRoundLabel } from "./teams.js";
import {
  sendPermanentMenu,
  round1InlineKeyboard,
  groupsInlineKeyboard,
} from "./keyboard.js";

const bot = new Telegraf(botToken);

// الاتصال بقاعدة البيانات
connectDB();

// 🛠️ دالة الانتظار الزمنية لتأمين البث الجماعي وحمايته من حظر تليجرام
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🛡️ درع حماية صارم ضد السبام (Per-User Cooldown)
const userCooldowns = new Map();

bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const now = Date.now();
  const LIMIT_TIME = 800;

  if (userCooldowns.has(userId)) {
    const lastTime = userCooldowns.get(userId);
    if (now - lastTime < LIMIT_TIME) {
      userCooldowns.set(userId, now);

      if (ctx.callbackQuery) {
        return ctx.answerCbQuery(
          "⚠️ مهلاً! الرجاء عدم الضغط بسرعة لتجنب الحظر.",
          { show_alert: true },
        );
      }
      return ctx.reply(
        "⚠️ **على رسلك!** الرجاء إرسال الطلبات ببطء لعدم الضغط على السيرفر.",
      );
    }
  }

  userCooldowns.set(userId, now);
  return next();
});

console.log("🛡️ بوت كأس العالم يعمل بنظام حماية متطور ومضاد للسبام...");

bot.telegram
  .setMyCommands([
    { command: "start", description: "تشغيل البوت وتفعيل الاشتراك" },
    { command: "menu", description: "إظهار لوحة التحكم الثابتة" },
  ])
  .then(() => {
    console.log("✅ تم ضبط قوائم الأوامر بنجاح على سيرفر تليجرام.");
  })
  .catch((err) => {
    console.error(
      "⚠️ تحذير: فشل ضبط الأوامر بسبب مشكلة في الشبكة:",
      err.message,
    );
  });

// 📢 دالة البث الجماعي المحدثة والمصلحة بالكامل
async function sendBroadcast(message) {
  try {
    const users = await Subscriber.find(
      { notifications: true },
      { chatId: 1, _id: 0 },
    );

    console.log(
      `📢 [Broadcast] جاري فحص الإرسال... القائمة تحتوي على: ${users.length} مستخدم دائم.`,
    );

    if (users.length === 0) {
      console.log(
        "⚠️ [Broadcast] لا يوجد مستخدمين مفعّلين للإشعارات في قاعدة البيانات حالياً.",
      );
      return;
    }

    for (const user of users) {
      const chatId = user.chatId;

      await bot.telegram
        .sendMessage(chatId, message, { parse_mode: "Markdown" })
        .catch(async (error) => {
          console.error(`❌ فشل الإرسال للمستخدم ${chatId}:`, error.message);
          // إذا قام المستخدم بحظر البوت، يتم تنظيفه فوراً من الداتا بيز
          if (
            error.response &&
            error.response.description.includes("forbidden")
          ) {
            console.log(`🗑️ جاري حذف المستخدم ${chatId} لأنه قام بحظر البوت.`);
            await Subscriber.deleteOne({ chatId });
          }
        });

      // انتظار 50 مللي ثانية لحماية البوت من الـ Flood وحظر تليجرام الصارم
      await delay(50);
    }
    console.log("✨ [Broadcast] تم الانتهاء من إرسال الإذاعة الجماعية بنجاح.");
  } catch (err) {
    console.error("❌ خطأ حرج أثناء الإرسال الجماعي:", err.message);
  }
}

bot.start(async (ctx) => {
  const chatId = ctx.chat.id;
  await Subscriber.updateOne(
    { chatId },
    { $setOnInsert: { notifications: true } },
    { upsert: true },
  );
  sendPermanentMenu(
    ctx,
    `👋 **أهلاً بك في بوت كأس العالم 2026!** 🏆⚽\n\n` +
      `يسعدنا انضمامك إلينا لتغطية الحدث الكروي الأكبر في العالم. ` +
      `من هنا يمكنك متابعة كل ما يخص المونديال لحظة بلحظة وبكل سهولة. 🔥\n\n` +
      `📌 **ماذا يقدم لك البوت؟**\n` +
      `⏺️ جدول مباريات اليوم، الغد، والأمس بتوقيت مكة المكرمة.\n` +
      `📊 ترتيب المجموعات المحدث فوراً.\n` +
      `🏅 قائمة الهدافين ومتابعة صراع الحذاء الذهبي.\n` +
      `🔔 إشعارات مباشرة للأهداف والأحداث الجارية (لا تفوت أي هدف!).\n\n` +
      `🎮 **لوحة التحكم الثابتة** ظهرت الآن أسفل الشاشة، استخدمها للتنقل الفوري بين القوائم.\n\n` +
      `🚀 _تمنى لمنتخبك المفضل حظاً موفقاً، واستمتع بتجربة مونديالية فريدة!_`,
  );
});

bot.command("menu", (ctx) =>
  sendPermanentMenu(ctx, "📋 **قائمة تحكم المونديال الدائمة:**"),
);

bot.command(["bc", "broadcast"], async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID?.toString()) {
    return ctx.reply("❌ عذراً، هذا الأمر مخصص لمالك البوت فقط.");
  }

  let messageToBroadcast = "";

  // الطريقة الأولى: إذا قمت بعمل Reply (رد) على رسالة كتبتها سابقاً
  if (ctx.message.reply_to_message) {
    messageToBroadcast = ctx.message.reply_to_message.text;
  } else {
    // الطريقة الثانية: إذا كتبت النص بجانب الأمر مباشرة مثل: /bc نص الرسالة
    messageToBroadcast = ctx.message.text.split(" ").slice(1).join(" ");
  }

  if (!messageToBroadcast || messageToBroadcast.trim() === "") {
    return ctx.reply(
      "⚠️ **طريقة الاستخدام:**\n" +
        "1️⃣ اكتب رسالتك بجانب الأمر: `/bc اكتب رسالتك هنا`\n" +
        "2️⃣ أو أرسل الرسالة في الشات ثم قم بعمل **Reply (رد)** عليها واكتب الأمر `/broadcast` فقط.",
      { parse_mode: "Markdown" },
    );
  }

  await ctx.reply(`⏳ جاري بدء الإرسال الجماعي الآن لجميع المشتركين...`);

  const totalSent = await sendBroadcast(messageToBroadcast);

  await ctx.reply(
    `✅ **اكتمل البث الجماعي بنجاح!**\n\nتم تسليم الرسالة إلى \`[ ${totalSent} ]\` مشترك نشط بنجاح. 🚀`,
    { parse_mode: "Markdown" },
  );
});

bot.command("stats", async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID?.toString()) {
    return ctx.reply("❌ هذا الأمر مخصص للإدارة فقط.");
  }
  try {
    const totalSubscribers = await Subscriber.countDocuments();
    const activeSubscribers = await Subscriber.countDocuments({
      notifications: true,
    });
    const inactiveSubscribers = await Subscriber.countDocuments({
      notifications: false,
    });
    ctx.reply(
      `📊 **إحصائيات المشتركين:**\n\n• الإجمالي: ${totalSubscribers}\n• النشطون: ${activeSubscribers}\n• غير النشطون: ${inactiveSubscribers}`,
    );
  } catch (err) {
    console.error("❌ خطأ أثناء جلب إحصائيات المشتركين:", err.message);
    ctx.reply("❌ حدث خطأ أثناء جلب إحصائيات المشتركين.");
  }
});

// ==========================================
// ⚙️ الجولة الأولى
// ==========================================
async function getRoundMatchesMessage(part) {
  const CACHE_DURATION = 10 * 60 * 1000;
  const now = Date.now();
  let matchesData = null;

  try {
    if (fs.existsSync(ROUND1_CACHE_FILE)) {
      const stats = fs.statSync(ROUND1_CACHE_FILE);
      if (now - stats.mtimeMs < CACHE_DURATION) {
        matchesData = JSON.parse(fs.readFileSync(ROUND1_CACHE_FILE, "utf8"));
        console.log("ℹ️ [Cache Hit] تم جلب مباريات الجولة الأولى من الكاش.");
      }
    }

    if (!matchesData) {
      console.log(
        "🌐 [API Request] جاري تحديث مباريات الجولة الأولى من السيرفر...",
      );
      const response = await axios.get(
        "https://api.football-data.org/v4/competitions/WC/matches",
        { headers: { "X-Auth-Token": apiKey }, timeout: 4000 },
      );
      matchesData = response.data.matches;
      fs.writeFileSync(ROUND1_CACHE_FILE, JSON.stringify(matchesData), "utf8");
    }

    if (!matchesData || matchesData.length === 0) return null;

    const round1Matches = matchesData.filter((match) => {
      const matchDate = match.utcDate.split("T")[0];
      return matchDate >= "2026-06-11" && matchDate <= "2026-06-18";
    });

    if (round1Matches.length === 0) return "📅 لم تبدأ الجولة الأولى بعد.";

    let startIndex = 0;
    let endIndex = 12;
    let partLabel = "الجزء الأول (11 - 15 يونيو)";
    if (part === "part2") {
      startIndex = 12;
      endIndex = round1Matches.length;
      partLabel = "الجزء الثاني (16 - 20 يونيو)";
    }

    const targetMatches = round1Matches.slice(startIndex, endIndex);
    let message = `📅 **جدول مباريات الافتتاح - ${partLabel}**\n📍 _بتوقيت مكة المكرمة_\n\n`;

    let currentDay = "";
    targetMatches.forEach((match) => {
      const makkahDateTime = moment.utc(match.utcDate).tz("Asia/Riyadh");
      const matchDate = makkahDateTime.format("YYYY-MM-DD");
      const matchTime = makkahDateTime.format("hh:mm A");

      if (currentDay !== matchDate) {
        currentDay = matchDate;
        message += `🗓️ **التاريخ الكروي: ${currentDay}**\n\n`;
      }

      const homeInfo = translateTeam(match.homeTeam.name);
      const awayInfo = translateTeam(match.awayTeam.name);
      const roundText = getRoundLabel(match.matchday);

      if (match.status === "FINISHED") {
        message += `${homeInfo.flag} *${homeInfo.name}* \`[ ${match.score.fullTime.home} - ${match.score.fullTime.away} ]\`  *${awayInfo.name}* ${awayInfo.flag}\n`;
        message += `🏆 _الوضع: ${roundText} (انتهت)_\n`;
      } else if (match.status === "LIVE" || match.status === "IN_PLAY") {
        message += `${homeInfo.flag} *${homeInfo.name}* \`🔥 [ ${match.score.fullTime.home} - ${match.score.fullTime.away} ]\`  *${awayInfo.name}* ${awayInfo.flag}\n`;
        message += `🏆 _الوضع: ${roundText} (مباشر الآن)_\n`;
      } else {
        message += `${homeInfo.flag} *${homeInfo.name}* \`[ 🆚 ${matchTime} ]\`  *${awayInfo.name}* ${awayInfo.flag}\n`;
        message += `🏆 _الوضع: ${roundText}_\n`;
      }
      message += `────────────────\n`;
    });
    return message;
  } catch (error) {
    console.error("❌ خطأ في جلب مباريات الجولة الأولى:", error.message);
    if (fs.existsSync(ROUND1_CACHE_FILE)) {
      const fallbackData = JSON.parse(
        fs.readFileSync(ROUND1_CACHE_FILE, "utf8"),
      );
      if (Array.isArray(fallbackData))
        return "📅 (بيانات مؤقتة) فشل الاتصال بالسيرفر، جاري عرض آخر تحديث مخزن...";
    }
    return "❌ عذراً، فشل جلب مباريات الجولة الأولى حالياً.";
  }
}

// الاستماع لزر الجولة الأولى الرئيسي
bot.hears("📅 الجولة الأولى", async (ctx) => {
  try {
    const message = await getRoundMatchesMessage("part1");
    await ctx.reply(message, {
      parse_mode: "Markdown",
      ...round1InlineKeyboard,
    });
  } catch (error) {
    ctx.reply("❌ عذراً، فشل جلب مباريات الجولة الأولى.");
  }
});

// معالج الأزرار الشفافة التفاعلية الخاصة بالجولة الأولى
bot.action(/round1_(.+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const part = ctx.match[1];
    const message = await getRoundMatchesMessage(part);

    const inlineKeyboard = [
      [
        {
          text: part === "part1" ? "🟢 الجزء الأول" : "◀️ الجزء الأول ⚪",
          callback_data: "round1_part1",
        },
        {
          text: part === "part2" ? "🟢 الجزء الثاني" : "⚪ الجزء الثاني ◀️",
          callback_data: "round1_part2",
        },
      ],
    ];

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: inlineKeyboard },
    });
  } catch (error) {
    console.error("خطأ أكشن الجولة 1:", error.message);
  }
});

// ==========================================
// 🏆 الأدوار الإقصائية (Knockout Stage)
// ==========================================
async function getKnockoutMatchesMessage() {
  const CACHE_DURATION = CACHE_EXPIRIES.DAILY_MATCHES; // 10 minutes
  const now = Date.now();
  let matchesData = null;

  try {
    if (fs.existsSync(KNOCKOUT_CACHE_FILE)) {
      const stats = fs.statSync(KNOCKOUT_CACHE_FILE);
      if (now - stats.mtimeMs < CACHE_DURATION) {
        matchesData = JSON.parse(fs.readFileSync(KNOCKOUT_CACHE_FILE, "utf8"));
        console.log("ℹ️ [Cache Hit] تم جلب مباريات الأدوار الإقصائية من الكاش.");
      }
    }

    if (!matchesData) {
      console.log("🌐 [API Request] جاري تحديث مباريات الأدوار الإقصائية من السيرفر...");
      const response = await axios.get(
        "https://api.football-data.org/v4/competitions/WC/matches",
        { headers: { "X-Auth-Token": apiKey }, timeout: 4000 }
      );
      matchesData = response.data.matches || [];
      fs.writeFileSync(KNOCKOUT_CACHE_FILE, JSON.stringify(matchesData), "utf8");
    }

    if (!matchesData || matchesData.length === 0) return null;

    const knockoutStages = [
      'LAST_32', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL', 'THIRD_PLACE'
    ];

    const knockoutMatches = matchesData.filter(match => knockoutStages.includes(match.stage));

    if (knockoutMatches.length === 0) {
      return '📊 لم تتحدد مواجهات الأدوار الإقصائية بعد. تابعنا لمعرفتها فور صدورها! 🎯';
    }

    const stagesTranslation = {
      'LAST_32': '🔹 دور الـ 32',
      'ROUND_OF_16': '🔥 دور الـ 16 (ثمن النهائي)',
      'QUARTER_FINALS': '🚀 دور ربع النهائي (8)',
      'SEMI_FINALS': '⚡ دور نصف النهائي (4)',
      'FINAL': '👑 النهائي الكبير',
      'THIRD_PLACE': '🥉 مباراة تحديد المركز الثالث'
    };

    // تجميع وترتيب المباريات حسب الدور
    const groupedMatches = {};
    knockoutStages.forEach(stage => {
      groupedMatches[stage] = [];
    });

    knockoutMatches.forEach(match => {
      if (groupedMatches[match.stage]) {
        groupedMatches[match.stage].push(match);
      }
    });

    let message = `🏆 **مواجهات الأدوار الإقصائية الحاسمة - كأس العالم 2026** ⚽\n📍 _بتوقيت مكة المكرمة_\n\n`;
    let hasMatches = false;

    knockoutStages.forEach(stage => {
      const stageMatches = groupedMatches[stage];
      if (stageMatches && stageMatches.length > 0) {
        hasMatches = true;
        message += `━━━━━━━ *${stagesTranslation[stage]}* ━━━━━━━\n\n`;

        stageMatches.forEach(match => {
          const homeInfo = translateTeam(match.homeTeam?.name || 'لم يحدد بعد');
          const awayInfo = translateTeam(match.awayTeam?.name || 'لم يحدد بعد');

          const makkahDateTime = moment.utc(match.utcDate).tz("Asia/Riyadh");
          const matchDate = makkahDateTime.format("YYYY-MM-DD");
          const matchTime = makkahDateTime.format("hh:mm A");

          const homeScore = match.score?.fullTime?.home !== null ? match.score.fullTime.home : '-';
          const awayScore = match.score?.fullTime?.away !== null ? match.score.fullTime.away : '-';

          let statusText = '';
          if (match.status === 'FINISHED') {
            statusText = `✅ (انتهت)`;
          } else if (match.status === 'LIVE' || match.status === 'IN_PLAY') {
            statusText = `🔴 مباشر الآن`;
          } else {
            statusText = `🗓️ ${matchDate} | 🆚 ${matchTime}`;
          }

          message += `${homeInfo.flag} *${homeInfo.name}* \`[ ${homeScore} - ${awayScore} ]\` *${awayInfo.name}* ${awayInfo.flag}\n`;
          message += `⏱️ _الحالة: ${statusText}_\n`;
          message += `────────────────\n\n`;
        });
      }
    });

    if (!hasMatches) {
      return '📊 لم تتحدد مواجهات الأدوار الإقصائية بعد. تابعنا لمعرفتها فور صدورها! 🎯';
    }

    return message;
  } catch (error) {
    console.error("❌ خطأ في جلب الأدوار الإقصائية:", error.message);
    if (fs.existsSync(KNOCKOUT_CACHE_FILE)) {
      try {
        const fallbackData = JSON.parse(fs.readFileSync(KNOCKOUT_CACHE_FILE, "utf8"));
        const knockoutStages = [
          'LAST_32', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL', 'THIRD_PLACE'
        ];
        const knockoutMatches = fallbackData.filter(match => knockoutStages.includes(match.stage));
        if (knockoutMatches.length > 0) {
          const stagesTranslation = {
            'LAST_32': '🔹 دور الـ 32',
            'ROUND_OF_16': '🔥 دور الـ 16 (ثمن النهائي)',
            'QUARTER_FINALS': '🚀 دور ربع النهائي (8)',
            'SEMI_FINALS': '⚡ دور نصف النهائي (4)',
            'FINAL': '👑 النهائي الكبير',
            'THIRD_PLACE': '🥉 مباراة تحديد المركز الثالث'
          };
          const groupedMatches = {};
          knockoutStages.forEach(stage => { groupedMatches[stage] = []; });
          knockoutMatches.forEach(match => { if (groupedMatches[match.stage]) groupedMatches[match.stage].push(match); });

          let message = `⚠️ (بيانات مؤقتة) فشل الاتصال بالسيرفر، جاري عرض آخر تحديث مخزن...\n\n`;
          message += `🏆 **مواجهات الأدوار الإقصائية الحاسمة - كأس العالم 2026** ⚽\n📍 _بتوقيت مكة المكرمة_\n\n`;
          
          let hasMatches = false;
          knockoutStages.forEach(stage => {
            const stageMatches = groupedMatches[stage];
            if (stageMatches && stageMatches.length > 0) {
              hasMatches = true;
              message += `━━━━━━━ *${stagesTranslation[stage]}* ━━━━━━━\n\n`;
              stageMatches.forEach(match => {
                const homeInfo = translateTeam(match.homeTeam?.name || 'لم يحدد بعد');
                const awayInfo = translateTeam(match.awayTeam?.name || 'لم يحدد بعد');
                const makkahDateTime = moment.utc(match.utcDate).tz("Asia/Riyadh");
                const matchDate = makkahDateTime.format("YYYY-MM-DD");
                const matchTime = makkahDateTime.format("hh:mm A");
                const homeScore = match.score?.fullTime?.home !== null ? match.score.fullTime.home : '-';
                const awayScore = match.score?.fullTime?.away !== null ? match.score.fullTime.away : '-';
                let statusText = match.status === 'FINISHED' ? `✅ (انتهت)` : (match.status === 'LIVE' || match.status === 'IN_PLAY' ? `🔴 مباشر` : `🗓️ ${matchDate} | 🆚 ${matchTime}`);
                message += `${homeInfo.flag} *${homeInfo.name}* \`[ ${homeScore} - ${awayScore} ]\` *${awayInfo.name}* ${awayInfo.flag}\n`;
                message += `⏱️ _الحالة: ${statusText}_\n`;
                message += `────────────────\n\n`;
              });
            }
          });
          if (hasMatches) return message;
        }
      } catch (e) {
        console.error(e.message);
      }
    }
    return "❌ عذراً، فشل جلب الأدوار الإقصائية حالياً.";
  }
}

// الاستماع لزر الأدوار الإقصائية من القائمة الرئيسية
bot.hears("🏆 الأدوار الإقصائية", async (ctx) => {
  try {
    const statusMsg = await ctx.reply("⏳ جاري جلب مواجهات الأدوار الإقصائية...");
    const message = await getKnockoutMatchesMessage();
    
    // حذف رسالة "جاري الجلب" وإرسال الرسالة النهائية
    await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("خطأ زر الأدوار الإقصائية:", error.message);
    await ctx.reply("❌ عذراً، فشل جلب مواجهات الأدوار الإقصائية.");
  }
});

// معالج الأكشن للأدوار الإقصائية (عند الاستدعاء المباشر)
bot.action('knockout_stage', async (ctx) => {
  try {
    await ctx.answerCbQuery('جاري تحميل مواجهات الحسم... ⏳');
    const message = await getKnockoutMatchesMessage();
    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("خطأ أكشن الأدوار الإقصائية:", error.message);
  }
});

// ==========================================
// ⚽ الجولة الثانية
// ==========================================
bot.hears("📅 الجولة الثانية", async (ctx) => {
  try {
    await ctx.reply("⏳ جاري جلب مباريات الجولة الثانية...");
    const responseMessage = await getRound2MatchesMessage();
    if (responseMessage) {
      await ctx.reply(responseMessage, { parse_mode: "Markdown" });
    } else {
      await ctx.reply("📅 لا توجد مباريات مجدولة للجولة الثانية حالياً.");
    }
  } catch (error) {
    ctx.reply("❌ عذراً، فشل جلب مباريات الجولة الثانية.");
  }
});

async function getRound2MatchesMessage() {
  const ROUND2_CACHE_FILE = "cache_round2_all.json";
  const CACHE_DURATION = 10 * 60 * 1000;
  const now = Date.now();
  let matchesData = null;

  try {
    if (fs.existsSync(ROUND2_CACHE_FILE)) {
      const stats = fs.statSync(ROUND2_CACHE_FILE);
      if (now - stats.mtimeMs < CACHE_DURATION) {
        matchesData = JSON.parse(fs.readFileSync(ROUND2_CACHE_FILE, "utf8"));
      }
    }

    if (!matchesData) {
      const response = await axios.get(
        "https://api.football-data.org/v4/competitions/WC/matches",
        { headers: { "X-Auth-Token": apiKey }, timeout: 4000 },
      );
      matchesData = response.data.matches;
      fs.writeFileSync(ROUND2_CACHE_FILE, JSON.stringify(matchesData), "utf8");
    }

    if (!matchesData || matchesData.length === 0) return null;

    const round2Matches = matchesData.filter((match) => {
      const matchDate = match.utcDate.split("T")[0];
      return matchDate >= "2026-06-18" && matchDate <= "2026-06-24";
    });

    if (round2Matches.length === 0) return "📅 لم تبدأ الجولة الثانية بعد.";

    let message = `📅 **جدول مباريات الجولة الثانية** 🏆\n📍 _بتوقيت مكة المكرمة_\n\n`;
    let currentDay = "";

    round2Matches.forEach((match) => {
      const makkahDateTime = moment.utc(match.utcDate).tz("Asia/Riyadh");
      const matchDate = makkahDateTime.format("YYYY-MM-DD");
      const matchTime = makkahDateTime.format("hh:mm A");

      if (currentDay !== matchDate) {
        currentDay = matchDate;
        message += `🗓️ **التاريخ الكروي: ${currentDay}**\n\n`;
      }

      const homeInfo = translateTeam(match.homeTeam.name);
      const awayInfo = translateTeam(match.awayTeam.name);
      const roundText = getRoundLabel(match.matchday);

      if (match.status === "FINISHED") {
        message += `${homeInfo.flag} *${homeInfo.name}* \`[ ${match.score.fullTime.home} - ${match.score.fullTime.away} ]\`  *${awayInfo.name}* ${awayInfo.flag}\n`;
        message += `🏆 _الوضع: ${roundText} (انتهت)_\n`;
      } else if (match.status === "LIVE" || match.status === "IN_PLAY") {
        message += `${homeInfo.flag} *${homeInfo.name}* \`🔥 [ ${match.score.fullTime.home} - ${match.score.fullTime.away} ]\`  *${awayInfo.name}* ${awayInfo.flag}\n`;
        message += `🏆 _الوضع: ${roundText} (مباشر الآن)_\n`;
      } else {
        message += `${homeInfo.flag} *${homeInfo.name}* \`[ 🆚 ${matchTime} ]\`  *${awayInfo.name}* ${awayInfo.flag}\n`;
        message += `🏆 _الوضع: ${roundText}_\n`;
      }
      message += `────────────────\n`;
    });
    return message;
  } catch (error) {
    console.error("❌ خطأ في جلب مباريات الجولة الثانية:", error.message);
    return "❌ عذراً، فشل جلب مباريات الجولة الثانية حالياً.";
  }
}

// ==========================================
// ⚽ الجولة الثالثة
// ==========================================
bot.hears("📅 الجولة الثالثة", async (ctx) => {
  try {
    await ctx.reply("⏳ جاري جلب مباريات الجولة الثالثة...");
    const responseMessage = await getRound3MatchesMessage();
    if (responseMessage) {
      await ctx.reply(responseMessage, { parse_mode: "Markdown" });
    } else {
      await ctx.reply("📅 لا توجد مباريات مجدولة للجولة الثالثة حالياً.");
    }
  } catch (error) {
    ctx.reply("❌ عذراً، فشل جلب مباريات الجولة الثالثة.");
  }
});

async function getRound3MatchesMessage() {
  const ROUND3_CACHE_FILE = "cache_round3_all.json";
  const CACHE_DURATION = 10 * 60 * 1000;
  const now = Date.now();
  let matchesData = null;

  try {
    if (fs.existsSync(ROUND3_CACHE_FILE)) {
      const stats = fs.statSync(ROUND3_CACHE_FILE);
      if (now - stats.mtimeMs < CACHE_DURATION) {
        matchesData = JSON.parse(fs.readFileSync(ROUND3_CACHE_FILE, "utf8"));
      }
    }

    if (!matchesData) {
      const response = await axios.get(
        "https://api.football-data.org/v4/competitions/WC/matches",
        { headers: { "X-Auth-Token": apiKey }, timeout: 4000 },
      );
      matchesData = response.data.matches;
      fs.writeFileSync(ROUND3_CACHE_FILE, JSON.stringify(matchesData), "utf8");
    }

    if (!matchesData || matchesData.length === 0) return null;

    const round3Matches = matchesData.filter((match) => {
      const matchDate = match.utcDate.split("T")[0];
      return matchDate >= "2026-06-24" && matchDate <= "2026-06-28";
    });

    if (round3Matches.length === 0) return "📅 لم تبدأ الجولة الثالثة بعد.";

    let message = `📅 **جدول مباريات الجولة الثالثة** 🏆\n📍 _بتوقيت مكة المكرمة_\n\n`;
    let currentDay = "";

    round3Matches.forEach((match) => {
      const makkahDateTime = moment.utc(match.utcDate).tz("Asia/Riyadh");
      const matchDate = makkahDateTime.format("YYYY-MM-DD");
      const matchTime = makkahDateTime.format("hh:mm A");

      if (currentDay !== matchDate) {
        currentDay = matchDate;
        message += `🗓️ **التاريخ الكروي: ${currentDay}**\n\n`;
      }

      const homeInfo = translateTeam(match.homeTeam.name);
      const awayInfo = translateTeam(match.awayTeam.name);
      const roundText = getRoundLabel(match.matchday);

      if (match.status === "FINISHED") {
        message += `${homeInfo.flag} *${homeInfo.name}* \`[ ${match.score.fullTime.home} - ${match.score.fullTime.away} ]\`  *${awayInfo.name}* ${awayInfo.flag}\n`;
        message += `🏆 _الوضع: ${roundText} (انتهت)_\n`;
      } else if (match.status === "LIVE" || match.status === "IN_PLAY") {
        message += `${homeInfo.flag} *${homeInfo.name}* \`🔥 [ ${match.score.fullTime.home} - ${match.score.fullTime.away} ]\`  *${awayInfo.name}* ${awayInfo.flag}\n`;
        message += `🏆 _الوضع: ${roundText} (مباشر الآن)_\n`;
      } else {
        message += `${homeInfo.flag} *${homeInfo.name}* \`[ 🆚 ${matchTime} ]\`  *${awayInfo.name}* ${awayInfo.flag}\n`;
        message += `🏆 _الوضع: ${roundText}_\n`;
      }
      message += `────────────────\n`;
    });
    return message;
  } catch (error) {
    console.error("❌ خطأ في جلب مباريات الجولة الثالثة:", error.message);
    return "❌ عذراً، فشل جلب مباريات الجولة الثالثة حالياً.";
  }
}

// ==========================================
// 🧠 نظام الكاش الذكي لـ (الأمس واليوم والغد)
// ==========================================
async function fetchAndSendMatches(ctx, targetDateStr, titleLabel, cacheFile) {
  const CACHE_DURATION = CACHE_EXPIRIES.DAILY_MATCHES;
  const now = Date.now();

  try {
    if (fs.existsSync(cacheFile)) {
      const cacheStats = fs.statSync(cacheFile);
      if (now - cacheStats.mtimeMs < CACHE_DURATION) {
        const cachedData = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
        if (Array.isArray(cachedData)) {
          console.log(
            `ℹ️ [Cache Hit] تم جلب ${titleLabel} من الكاش المحلي بنجاح.`,
          );
          return processAndSendMatchesList(
            ctx,
            cachedData,
            targetDateStr,
            titleLabel,
          );
        }
      }
    }

    console.log(
      `🌐 [API Request] جاري جلب ${titleLabel} من السيرفر الخارجي...`,
    );
    const response = await axios.get(
      "https://api.football-data.org/v4/competitions/WC/matches",
      { headers: { "X-Auth-Token": apiKey }, timeout: 4000 },
    );

    const matchesData =
      response.data && response.data.matches ? response.data.matches : [];

    if (!Array.isArray(matchesData)) {
      throw new Error("بنية البيانات ليست مصفوفة صالحة.");
    }

    fs.writeFileSync(cacheFile, JSON.stringify(matchesData), "utf8");
    return processAndSendMatchesList(
      ctx,
      matchesData,
      targetDateStr,
      titleLabel,
    );
  } catch (error) {
    console.error(`❌ خطأ في كاش ${titleLabel}:`, error.message);
    if (fs.existsSync(cacheFile)) {
      try {
        const fallbackData = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
        if (Array.isArray(fallbackData)) {
          return processAndSendMatchesList(
            ctx,
            fallbackData,
            targetDateStr,
            `${titleLabel} (مؤقت)`,
          );
        }
      } catch (e) {
        console.error(e.message);
      }
    }
    ctx.reply(
      `📅 **جدول ${titleLabel}:**\n\nلا توجد مباريات مجدولة حالياً أو السيرفر قيد التحديث. ☕`,
    );
  }
}

function processAndSendMatchesList(ctx, matches, targetDateStr, titleLabel) {
  const safeMatches = Array.isArray(matches) ? matches : [];
  const filteredMatches = safeMatches.filter((match) => {
    return (
      match &&
      match.utcDate &&
      moment.utc(match.utcDate).tz("Asia/Riyadh").format("YYYY-MM-DD") ===
        targetDateStr
    );
  });

  if (filteredMatches.length === 0) {
    return ctx.reply(
      `📅 **جدول ${titleLabel}:**\n\nلا توجد مباريات في هذا اليوم. ☕`,
    );
  }

  let message = `📅 **جدول ${titleLabel}:**\n📍 _بتوقيت مكة المكرمة_\n\n`;

  filteredMatches.forEach((match) => {
    if (!match.homeTeam || !match.awayTeam || !match.score) return;

    const homeInfo = translateTeam(match.homeTeam.name);
    const awayInfo = translateTeam(match.awayTeam.name);
    const matchTime = moment
      .utc(match.utcDate)
      .tz("Asia/Riyadh")
      .format("hh:mm A");
    const roundText = getRoundLabel(match.matchday);

    if (match.status === "FINISHED") {
      message += `${homeInfo.flag} *${homeInfo.name}* \`[ ${match.score.fullTime.home} - ${match.score.fullTime.away} ]\`  *${awayInfo.name}* ${awayInfo.flag}\n`;
      message += `🏆 الوضع: *${roundText}* | 🟢 انتهت\n`;
    } else if (match.status === "LIVE" || match.status === "IN_PLAY") {
      message += `${homeInfo.flag} *${homeInfo.name}* \`🔥 [ ${match.score.fullTime.home} - ${match.score.fullTime.away} ]\`  *${awayInfo.name}* ${awayInfo.flag}\n`;
      message += `🏆 الوضع: *${roundText}* | مباشر الآن\n`;
    } else {
      message += `${homeInfo.flag} *${homeInfo.name}* \`[ 🆚 ${matchTime} ]\`  *${awayInfo.name}* ${awayInfo.flag}\n`;
      message += `🏆 الوضع: *${roundText}*\n`;
    }
    message += `────────────────\n\n`;
  });

  ctx.reply(message, { parse_mode: "Markdown" });
}

bot.hears("◀️ مباريات الأمس", async (ctx) => {
  const yesterday = moment()
    .tz("Asia/Riyadh")
    .subtract(1, "days")
    .format("YYYY-MM-DD");
  await fetchAndSendMatches(
    ctx,
    yesterday,
    "مباريات الأمس",
    MATCHES_YESTERDAY_CACHE,
  );
});

bot.hears("⏺️ مباريات اليوم", async (ctx) => {
  const today = moment().tz("Asia/Riyadh").format("YYYY-MM-DD");
  await fetchAndSendMatches(ctx, today, "مباريات اليوم", MATCHES_TODAY_CACHE);
});

bot.hears("▶️ مباريات الغد", async (ctx) => {
  const tomorrow = moment()
    .tz("Asia/Riyadh")
    .add(1, "days")
    .format("YYYY-MM-DD");
  await fetchAndSendMatches(
    ctx,
    tomorrow,
    "مباريات الغد",
    MATCHES_TOMORROW_CACHE,
  );
});

// ==========================================
// ⚙️ جدول الترتيب
// ==========================================
async function getGroupStandingsMessage(range) {
  let standingsData = null;
  let useCache = false;

  if (fs.existsSync(STANDINGS_CACHE_FILE)) {
    const stats = fs.statSync(STANDINGS_CACHE_FILE);
    const now = Date.now();

    if (now - stats.mtimeMs < CACHE_EXPIRIES.STABLE_DATA) {
      standingsData = JSON.parse(fs.readFileSync(STANDINGS_CACHE_FILE, "utf8"));
      useCache = true;
    }
  }

  if (!useCache) {
    try {
      const response = await axios.get(
        "https://api.football-data.org/v4/competitions/WC/standings",
        { headers: { "X-Auth-Token": apiKey }, timeout: 4000 },
      );
      standingsData = response.data.standings;
      fs.writeFileSync(
        STANDINGS_CACHE_FILE,
        JSON.stringify(standingsData),
        "utf8",
      );
    } catch (err) {
      console.error(
        "⚠️ فشل تحديث الترتيب، سيتم محاولة عرض الكاش المتاح:",
        err.message,
      );
      if (fs.existsSync(STANDINGS_CACHE_FILE)) {
        standingsData = JSON.parse(
          fs.readFileSync(STANDINGS_CACHE_FILE, "utf8"),
        );
      }
    }
  }

  if (!standingsData || standingsData.length === 0) return null;

  let targetGroups = [];
  if (range === "AD")
    targetGroups = [
      "GROUP_A",
      "GROUP_B",
      "GROUP_C",
      "GROUP_D",
      "Group A",
      "Group B",
      "Group C",
      "Group D",
    ];
  if (range === "EH")
    targetGroups = [
      "GROUP_E",
      "GROUP_F",
      "GROUP_G",
      "GROUP_H",
      "Group E",
      "Group F",
      "Group G",
      "Group H",
    ];
  if (range === "IL")
    targetGroups = [
      "GROUP_I",
      "GROUP_J",
      "GROUP_K",
      "GROUP_L",
      "Group I",
      "Group J",
      "Group K",
      "Group L",
    ];

  let rangeLabel =
    range === "AD" ? "A - D" : range === "EH" ? "E - H" : "I - L";
  let message = `📊 **جدول ترتيب مجموعات كأس العالم 2026 (${rangeLabel})** 🏆\n\n`;

  standingsData.forEach((groupData) => {
    if (targetGroups.includes(groupData.group)) {
      let groupName = groupData.group
        .replace("GROUP_", "المجموعة ")
        .replace("Group ", "المجموعة ");

      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📌 *${groupName}*\n`;

      groupData.table.forEach((teamRow, index) => {
        const teamInfo = translateTeam(teamRow.team.name);
        let posEmoji =
          index === 0 ? "🥇" : index === 1 ? "🥈" : `${index + 1}️⃣`;

        message += `${posEmoji} ${teamInfo.flag} *${teamInfo.name}*\n`;
        message += ` ├ 🔹 النقاط: [ ${teamRow.points} ]\n`;
        message += ` └ 🏃 لعب: [ ${teamRow.playedGames} ]\n`;
        message += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
      });
      message += `\n`;
    }
  });
  return message;
}

// الاستماع لزر جدول الترتيب الرئيسي
bot.hears("📊 جدول الترتيب", async (ctx) => {
  try {
    const message = await getGroupStandingsMessage("AD");
    await ctx.reply(message, {
      parse_mode: "Markdown",
      ...groupsInlineKeyboard,
    });
  } catch (error) {
    ctx.reply("❌ فشل جلب الترتيب.");
  }
});

// المعالج الذكي المصلح لتبديل المجموعات دون تداخل
bot.action(/show_groups_(.+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const range = ctx.match[1];

    const message = await getGroupStandingsMessage(range);
    if (!message)
      return ctx.reply(
        "❌ عذراً، لم نتمكن من الحصول على البيانات لهذا النطاق.",
      );

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      ...groupsInlineKeyboard,
    });
  } catch (error) {
    console.error("خطأ أكشن المجموعات المطور:", error.message);
  }
});

// ==========================================
// ⚙️ هدافو البطولة والمميزات الثابتة
// ==========================================
bot.hears("🏅 هدافو البطولة", async (ctx) => {
  try {
    let scorersData = null;
    let useCache = false;

    if (fs.existsSync(SCORERS_CACHE_FILE)) {
      const stats = fs.statSync(SCORERS_CACHE_FILE);
      const now = Date.now();
      if (now - stats.mtimeMs < CACHE_EXPIRIES.STABLE_DATA) {
        scorersData = JSON.parse(fs.readFileSync(SCORERS_CACHE_FILE, "utf8"));
        useCache = true;
      }
    }

    if (!useCache) {
      try {
        const response = await axios.get(
          "https://api.football-data.org/v4/competitions/WC/scorers",
          {
            headers: { "X-Auth-Token": apiKey },
            params: { limit: 10 },
            timeout: 4000,
          },
        );
        scorersData = response.data.scorers;
        fs.writeFileSync(
          SCORERS_CACHE_FILE,
          JSON.stringify(scorersData),
          "utf8",
        );
      } catch (err) {
        console.error(
          "⚠️ فشل تحديث الهدافين، سيتم استخدام الكاش إن وُجد:",
          err.message,
        );
        if (fs.existsSync(SCORERS_CACHE_FILE)) {
          scorersData = JSON.parse(fs.readFileSync(SCORERS_CACHE_FILE, "utf8"));
        }
      }
    }

    if (!scorersData || scorersData.length === 0) {
      return ctx.reply("🏅 القائمة غير متاحة بعد أو البطولة لم تبدأ.");
    }

    let message = `🏅 **قائمة هدافي كأس العالم (TOP 10):**\n\n`;
    scorersData.forEach((scorer, index) => {
      const teamInfo = translateTeam(scorer.team.name);
      let medal =
        index === 0
          ? "🥇"
          : index === 1
            ? "🥈"
            : index === 2
              ? "🥉"
              : `${index + 1}️⃣`;
      message += `${medal} *${scorer.player.name}* (${teamInfo.flag} ${teamInfo.name})\n⚽ الأهداف: *${scorer.goals}*\n────────────────\n`;
    });
    ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    ctx.reply("❌ فشل جلب قائمة الهدافين.");
  }
});

bot.hears("🔕 وضع الصمت", async (ctx) => {
  await Subscriber.updateOne({ chatId: ctx.chat.id }, { notifications: false });
  ctx.reply("🔕 تم إيقاف الإشعارات بنجاح.");
});

bot.hears("🔔 تشغيل الصوت", async (ctx) => {
  await Subscriber.updateOne({ chatId: ctx.chat.id }, { notifications: true });
  ctx.reply("🔔 تم تفعيل الصوت بنجاح.");
});

// ==========================================
// ⭐ نظام دعم البوت بالنجوم (Telegram Stars)
// ==========================================
bot.hears("⭐ دعم البوت", async (ctx) => {
  await ctx.reply(
    "❤️ **شكراً لدعم بوت كأس العالم 2026**\n\nاختر كمية النجوم التي تود دعم البوت بها من القائمة أدناه: 🌟",
    Markup.inlineKeyboard([
      [Markup.button.callback("⭐ 10 نجوم", "donate_10")],
      [Markup.button.callback("⭐⭐ 50 نجمة", "donate_50")],
      [Markup.button.callback("⭐⭐⭐ 100 نجمة", "donate_100")],
    ]),
  );
});

const sendInvoiceHelper = async (ctx, amount) => {
  try {
    await ctx.answerCbQuery();
    await ctx.replyWithInvoice({
      title: "دعم بوت كأس العالم",
      description: "شكراً لدعمك وتطويرك للبوت ⭐",
      payload: `donate_${amount}`,
      provider_token: "",
      currency: "XTR",
      prices: [{ label: `${amount} Stars`, amount: amount }],
    });
  } catch (err) {
    console.error(err.message);
  }
};

bot.action("donate_10", (ctx) => sendInvoiceHelper(ctx, 10));
bot.action("donate_50", (ctx) => sendInvoiceHelper(ctx, 50));
bot.action("donate_100", (ctx) => sendInvoiceHelper(ctx, 100));

bot.on("pre_checkout_query", async (ctx) => {
  try {
    await ctx.answerPreCheckoutQuery(true);
  } catch (error) {
    console.error("❌ خطأ في Pre-Checkout:", error.message);
    await ctx.answerPreCheckoutQuery(false, "حدث خطأ أثناء معالجة الفاتورة.");
  }
});

bot.on("successful_payment", async (ctx) => {
  const starsAmount = ctx.message.successful_payment.total_amount;
  ctx.reply(
    `❤️ **شكراً لدعمك لبوت كأس العالم 2026!**\n\n` +
      `⭐ تم استلام دعمك بقيمة *${starsAmount} نجمة* بنجاح.\n\n` +
      `مساهمتك تساعدنا على دفع تكاليف السيرفرات وتحسين خدمات البوت باستمرار.\n🏆⚽ نتمنى لك متابعة ممتعة للمونديال.`,
  );

  if (ADMIN_ID) {
    bot.telegram
      .sendMessage(
        ADMIN_ID,
        `💰 **عملية دعم جديدة:** تم استلام ${starsAmount} نجمة من المستخدم \`${ctx.from.id}\`.`,
      )
      .catch(() => {});
  }
});

// ==========================================
// 🔄 البث الحي للأهداف ومراقبة المباريات الحية
// ==========================================
const startedMatches = new Set();

async function checkLiveMatches() {
  const now = Date.now();

  try {
    if (fs.existsSync(MATCHES_LIVE_CACHE)) {
      const stats = fs.statSync(MATCHES_LIVE_CACHE);
      if (now - stats.mtimeMs < CACHE_EXPIRIES.LIVE_MATCHES) {
        return;
      }
    }

    console.log(
      "🌐 [API Request] جاري فحص أحداث المباريات الحية والاهداف الآن...",
    );

    const response = await axios.get(
      "https://api.football-data.org/v4/matches",
      {
        headers: { "X-Auth-Token": apiKey },
        params: { competitions: "WC" },
        timeout: 4000,
      },
    );

    const matches = response.data.matches || [];
    fs.writeFileSync(MATCHES_LIVE_CACHE, JSON.stringify(matches), "utf8");

    if (matches.length === 0) return;

    for (const match of matches) {
      const matchId = match.id;
      const homeInfo = translateTeam(match.homeTeam.name);
      const awayInfo = translateTeam(match.awayTeam.name);

      // 🔔 1. إشعار بداية المباراة الجماعي
      if (
        (match.status === "LIVE" || match.status === "IN_PLAY") &&
        !startedMatches.has(matchId)
      ) {
        startedMatches.add(matchId);
        const startMessage =
          `🎬 **انطلقت المباراة الآن!** ⚽\n\n` +
          `${homeInfo.flag} *${homeInfo.name}* 🆚  *${awayInfo.name}* ${awayInfo.flag}\n\n` +
          `🏆 تمنياتنا بمباراة ممتعة ومشوقة لجميع المتابعين! 🔥`;
        await sendBroadcast(startMessage);
      }

      // ⚽ 2. كود فحص الأهداف والبث الحي الذكي
      const cacheGoalKey = `goal_${matchId}_${match.score.fullTime.home}_${match.score.fullTime.away}`;

      if (match.status === "LIVE" || match.status === "IN_PLAY") {
        const homeGoals = match.score.fullTime.home;
        const awayGoals = match.score.fullTime.away;

        // إذا أحرز أي فريق هدفاً ولم يتم تخزين هذا المفتاح في السيرفر بعد
        if (
          (homeGoals > 0 || awayGoals > 0) &&
          !fs.existsSync(`cache_${cacheGoalKey}.tmp`)
        ) {
          fs.writeFileSync(`cache_${cacheGoalKey}.tmp`, "sent", "utf8");

          const goalMessage =
            `🔥 **جــــــــووووووووول! هدف جديد الآن!** ⚽\n\n` +
            `${homeInfo.flag} *${homeInfo.name}* [ ${homeGoals} ]  -  [ ${awayGoals} ]  *${awayInfo.name}* ${awayInfo.flag}\n\n` +
            `🏆 تابع التغطية الحية للمونديال لحظة بلحظة مع البوت!`;

          await sendBroadcast(goalMessage);
        }
      }
    }
  } catch (err) {
    console.error("❌ خطأ فحص المباريات الحية وبث الأهداف:", err.message);
  }
}

// تشغيل نظام الفحص الدوري للأهداف والمباريات الحية بناء على الفترة المحددة بالكونفيج
setInterval(checkLiveMatches, checkInterval);

// تشغيل البوت النهائي
bot.launch().then(() => {
  console.log("====================================================");
  console.log("🚀 البوت مستقر تماماً ويعمل بكافة الميزات الاحترافية الآن!");
  console.log("====================================================");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
