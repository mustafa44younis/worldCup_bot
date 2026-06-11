// keyboard.js

// 📅 أزرار التنقل الخاصة بالجولة الأولى
export const round1InlineKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "1️⃣ الجزء الأول (11-15)", callback_data: "round1_part1" },
        { text: "2️⃣ الجزء الثاني (16-20)", callback_data: "round1_part2" },
      ],
    ],
  },
};

// 📊 أزرار التنقل التفاعلية لجدول الترتيب (تم تنظيف الرموز لضمان الاستجابة الفورية)
export const groupsInlineKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🅰️ المجموعات A-D", callback_data: "show_groups_AD" },
        { text: "🔹 المجموعات E-H", callback_data: "show_groups_EH" },
        { text: "🔸 المجموعات I-L", callback_data: "show_groups_IL" },
      ],
    ],
  },
};

// 🏛️ دالة إرسال القائمة الرئيسية الثابتة (تم إصلاح هيكلة المعاملات لتليجرام)
export function sendPermanentMenu(ctx, text) {
  return ctx.reply(text, {
    parse_mode: "Markdown",
    reply_markup: {
      keyboard: [
        [{ text: "⏺️ مباريات اليوم" }, { text: "📊 جدول الترتيب" }],
        [{ text: "◀️ مباريات الأمس" }, { text: "▶️ مباريات الغد" }],
        [{ text: "📅 الجولة الأولى" }, { text: "📅 الجولة الثانية" }],
        [{ text: "📅 الجولة الثالثة" }, { text: "🏅 هدافو البطولة" }],
        [{ text: "🔔 تشغيل الصوت" }, { text: "🔕 وضع الصمت" }],
        [{ text: "⭐ دعم البوت" }],
      ],
      resize_keyboard: true,
      one_time_keyboard: false, // لتبقى اللوحة ثابتة أسفل الشاشة
    },
  });
}