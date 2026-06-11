// teams.js
export const worldCupTeams = {
    "czechia": { flag: "🇨🇿", arabicName: "التشيك" }, "mexico": { flag: "🇲🇽", arabicName: "المكسيك" },
    "south africa": { flag: "🇿🇦", arabicName: "جنوب إفريقيا" }, "south korea": { flag: "🇰🇷", arabicName: "كوريا الجنوبية" },
    "bosnia-herzegovina": { flag: "🇧🇦", arabicName: "البوسنة والهرسك" }, "canada": { flag: "🇨🇦", arabicName: "كندا" },
    "qatar": { flag: "🇶🇦", arabicName: "قطر" }, "switzerland": { flag: "🇨🇭", arabicName: "سويسرا" },
    "brazil": { flag: "🇧🇷", arabicName: "البرازيل" }, "morocco": { flag: "🇲🇦", arabicName: "المغرب" },
    "haiti": { flag: "🇭🇹", arabicName: "هايتي" }, "scotland": { flag: "🇬🇧", arabicName: "إسكتلندا" },
    "turkey": { flag: "🇹🇷", arabicName: "تركيا" }, "usa": { flag: "🇺🇸", arabicName: "أمريكا" },
    "united states": { flag: "🇺🇸", arabicName: "أمريكا" }, "paraguay": { flag: "🇵🇾", arabicName: "باراغواي" },
    "australia": { flag: "🇦🇺", arabicName: "أستراليا" }, "germany": { flag: "🇩🇪", arabicName: "ألمانيا" },
    "curaçao": { flag: "🇨🇼", arabicName: "كوراساو" }, "curacao": { flag: "🇨🇼", arabicName: "كوراساو" },
    "ivory coast": { flag: "🇨🇮", arabicName: "ساحل العاج" }, "ecuador": { flag: "🇪🇨", arabicName: "الإكوادور" },
    "sweden": { flag: "🇸🇪", arabicName: "السويد" }, "netherlands": { flag: "🇳🇱", arabicName: "هولندا" },
    "japan": { flag: "🇯🇵", arabicName: "اليابان" }, "tunisia": { flag: "🇹🇳", arabicName: "تونس" },
    "belgium": { flag: "🇧🇪", arabicName: "بلجيكا" }, "egypt": { flag: "🇪🇬", arabicName: "مصر" },
    "iran": { flag: "🇮🇷", arabicName: "إيران" }, "new zealand": { flag: "🇳🇿", arabicName: "نيوزيلندا" },
    "spain": { flag: "🇪🇸", arabicName: "إسبانيا" }, "cape verde islands": { flag: "🇨🇻", arabicName: "جزر الرأس الأخضر" },
    "cape verde": { flag: "🇨🇻", arabicName: "جزر الرأس الأخضر" }, "saudi arabia": { flag: "🇸🇦", arabicName: "السعودية" },
    "uruguay": { flag: "🇺🇾", arabicName: "أوروغواي" }, "iraq": { flag: "🇮🇶", arabicName: "العراق" },
    "france": { flag: "🇫🇷", arabicName: "فرنسا" }, "senegal": { flag: "🇸🇳", arabicName: "السنغال" },
    "norway": { flag: "🇳🇴", arabicName: "النرويج" }, "argentina": { flag: "🇦🇷", arabicName: "الأرجنتين" },
    "algeria": { flag: "🇩🇿", arabicName: "الجزائر" }, "austria": { flag: "🇦🇹", arabicName: "النمسا" },
    "jordan": { flag: "🇯🇴", arabicName: "الأردن" }, "congo dr": { flag: "🇨🇩", arabicName: "الكونغو الديمقراطية" },
    "dr congo": { flag: "🇨🇩", arabicName: "الكونغو الديمقراطية" }, "portugal": { flag: "🇵🇹", arabicName: "البرتغال" },
    "uzbekistan": { flag: "🇺🇿", arabicName: "أوزبكستان" }, "colombia": { flag: "🇨🇴", arabicName: "كولومبيا" },
    "england": { flag: "🇬🇧", arabicName: "إنجلترا" }, "croatia": { flag: "🇭🇷", arabicName: "كرواتيا" },
    "ghana": { flag: "🇬🇭", arabicName: "غانا" }, "panama": { flag: "🇵🇦", arabicName: "بنما" }
};

export function translateTeam(englishName) {
    if (!englishName) return { flag: "🏳️", name: "منتخب مجهول" };
    const cleanName = englishName.toLowerCase().trim();
    if (worldCupTeams[cleanName]) {
        return { flag: worldCupTeams[cleanName].flag, name: worldCupTeams[cleanName].arabicName };
    }
    return { flag: "🏳️", name: englishName };
}

export function getRoundLabel(matchday) {
    if (matchday === 1) return "الجولة الأولى";
    if (matchday === 2) return "الجولة الثانية";
    if (matchday === 3) return "الجولة الثالثة";
    return `الجولة ${matchday}`;
}