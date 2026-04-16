// Lightweight i18n supporting English, Tamil, Hindi
type Lang = "en" | "ta" | "hi";

const translations: Record<string, Record<Lang, string>> = {
  not_found: { en: "Resource not found.", ta: "தகவல் கிடைக்கவில்லை.", hi: "संसाधन नहीं मिला।" },
  server_error: { en: "Server error.", ta: "சேவையக பிழை.", hi: "सर्वर त्रुटि।" },
};

export const t = (key: string, lang: Lang = "en", vars?: any): string => {
  let text = translations[key]?.[lang] || key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    });
  }
  return text;
};

export const detectLang = (header?: string, userLang?: string): Lang => {
  if (userLang && ["en", "ta", "hi"].includes(userLang)) return userLang as Lang;
  if (header) {
    const primary = header.split(",")[0].split("-")[0].toLowerCase();
    if (["en", "ta", "hi"].includes(primary)) return primary as Lang;
  }
  return "en";
};