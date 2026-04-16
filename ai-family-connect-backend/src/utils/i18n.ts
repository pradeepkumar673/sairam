/**
 * utils/i18n.ts
 * Lightweight i18n helper — translates system messages based on user's language preference.
 * Supported: English (en), Tamil (ta), Hindi (hi), Spanish (es), French (fr)
 */

type Lang = "en" | "ta" | "hi" | "es" | "fr";

type TranslationKey =
  | "medicine_reminder"
  | "medicine_missed"
  | "low_stock"
  | "sos_triggered"
  | "fall_detected"
  | "checkin_reminder"
  | "no_checkin_alert"
  | "good_morning"
  | "take_medicine"
  | "login_success"
  | "register_success"
  | "unauthorized"
  | "not_found"
  | "server_error";

const translations: Record<TranslationKey, Record<Lang, string>> = {
  medicine_reminder: {
    en: "Time to take your medicine: {medicine} ({dosage})",
    ta: "உங்கள் மருந்து எடுக்கும் நேரம்: {medicine} ({dosage})",
    hi: "अपनी दवा लेने का समय: {medicine} ({dosage})",
    es: "Es hora de tomar su medicina: {medicine} ({dosage})",
    fr: "Il est temps de prendre votre médicament: {medicine} ({dosage})",
  },
  medicine_missed: {
    en: "You missed your {medicine} dose at {time}.",
    ta: "{time} மணிக்கு உங்கள் {medicine} மருந்தை மறந்துவிட்டீர்கள்.",
    hi: "आपने {time} बजे अपनी {medicine} की खुराक लेना भूल गए।",
    es: "Olvidó tomar su dosis de {medicine} a las {time}.",
    fr: "Vous avez oublié votre dose de {medicine} à {time}.",
  },
  low_stock: {
    en: "Only {count} doses of {medicine} remaining. Please refill soon.",
    ta: "{medicine} மருந்து {count} டோஸ் மட்டுமே உள்ளது. விரைவில் நிரப்பவும்.",
    hi: "{medicine} की केवल {count} खुराकें बची हैं। कृपया जल्द रिफिल करें।",
    es: "Solo quedan {count} dosis de {medicine}. Por favor, rellene pronto.",
    fr: "Il ne reste que {count} doses de {medicine}. Veuillez recharger bientôt.",
  },
  sos_triggered: {
    en: "SOS alert triggered! {name} needs immediate help.",
    ta: "SOS எச்சரிக்கை! {name} உடனடி உதவி தேவை.",
    hi: "SOS अलर्ट! {name} को तत्काल सहायता चाहिए।",
    es: "¡Alerta SOS! {name} necesita ayuda inmediata.",
    fr: "Alerte SOS! {name} a besoin d'aide immédiate.",
  },
  fall_detected: {
    en: "Fall detected for {name}! Please check on them immediately.",
    ta: "{name} விழுந்துவிட்டார்! உடனே பார்க்கவும்.",
    hi: "{name} के गिरने का पता चला! तुरंत देखें।",
    es: "¡Caída detectada para {name}! Por favor, compruébalo inmediatamente.",
    fr: "Chute détectée pour {name}! Veuillez vérifier immédiatement.",
  },
  checkin_reminder: {
    en: "Good morning, {name}! Don't forget to check in today.",
    ta: "காலை வணக்கம், {name}! இன்று செக்-இன் செய்ய மறவாதீர்கள்.",
    hi: "सुप्रभात, {name}! आज चेक-इन करना न भूलें।",
    es: "¡Buenos días, {name}! No olvides hacer check-in hoy.",
    fr: "Bonjour, {name}! N'oubliez pas de vous enregistrer aujourd'hui.",
  },
  no_checkin_alert: {
    en: "{name} hasn't checked in today. Please check on them.",
    ta: "{name} இன்று செக்-இன் செய்யவில்லை. அவர்களை பார்க்கவும்.",
    hi: "{name} ने आज चेक-इन नहीं किया। कृपया उन्हें देखें।",
    es: "{name} no ha hecho check-in hoy. Por favor, compruébalo.",
    fr: "{name} ne s'est pas enregistré aujourd'hui. Veuillez le vérifier.",
  },
  good_morning: {
    en: "Good morning!",
    ta: "காலை வணக்கம்!",
    hi: "सुप्रभात!",
    es: "¡Buenos días!",
    fr: "Bonjour!",
  },
  take_medicine: {
    en: "Please take your medicine.",
    ta: "தயவுசெய்து உங்கள் மருந்தை எடுங்கள்.",
    hi: "कृपया अपनी दवा लें।",
    es: "Por favor tome su medicina.",
    fr: "Veuillez prendre votre médicament.",
  },
  login_success: {
    en: "Login successful. Welcome back!",
    ta: "உள்நுழைவு வெற்றிகரமாக முடிந்தது. மீண்டும் வரவேற்கிறோம்!",
    hi: "लॉगिन सफल रहा। वापसी पर स्वागत है!",
    es: "Inicio de sesión exitoso. ¡Bienvenido de nuevo!",
    fr: "Connexion réussie. Content de vous revoir!",
  },
  register_success: {
    en: "Registration successful. Welcome to Family Connect!",
    ta: "பதிவு வெற்றிகரமாக முடிந்தது. Family Connect-ல் வரவேற்கிறோம்!",
    hi: "पंजीकरण सफल। Family Connect में आपका स्वागत है!",
    es: "Registro exitoso. ¡Bienvenido a Family Connect!",
    fr: "Inscription réussie. Bienvenue dans Family Connect!",
  },
  unauthorized: {
    en: "You are not authorized to perform this action.",
    ta: "இந்த செயலை செய்ய உங்களுக்கு அனுமதி இல்லை.",
    hi: "आप इस कार्य को करने के लिए अधिकृत नहीं हैं।",
    es: "No está autorizado para realizar esta acción.",
    fr: "Vous n'êtes pas autorisé à effectuer cette action.",
  },
  not_found: {
    en: "The requested resource was not found.",
    ta: "கோரிய தகவல் கிடைக்கவில்லை.",
    hi: "अनुरोधित संसाधन नहीं मिला।",
    es: "No se encontró el recurso solicitado.",
    fr: "La ressource demandée est introuvable.",
  },
  server_error: {
    en: "An unexpected server error occurred. Please try again.",
    ta: "எதிர்பாராத சேவையக பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.",
    hi: "एक अप्रत्याशित सर्वर त्रुटि हुई। कृपया पुनः प्रयास करें।",
    es: "Ocurrió un error inesperado en el servidor. Inténtelo de nuevo.",
    fr: "Une erreur inattendue du serveur s'est produite. Veuillez réessayer.",
  },
};

/**
 * Translate a key with optional variable substitution
 * @example t("medicine_reminder", "ta", { medicine: "Metformin", dosage: "500mg" })
 */
export const t = (
  key: TranslationKey,
  lang: Lang = "en",
  vars: Record<string, string | number> = {}
): string => {
  const supportedLangs: Lang[] = ["en", "ta", "hi", "es", "fr"];
  const safeLang: Lang = supportedLangs.includes(lang) ? lang : "en";

  let text = translations[key]?.[safeLang] ?? translations[key]?.["en"] ?? key;

  // Replace {variable} placeholders
  for (const [varKey, value] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${varKey}\\}`, "g"), String(value));
  }

  return text;
};

/**
 * Detect preferred language from Accept-Language header or user profile
 */
export const detectLang = (acceptLanguage?: string, userLang?: string): Lang => {
  const supported: Lang[] = ["en", "ta", "hi", "es", "fr"];
  if (userLang && supported.includes(userLang as Lang)) return userLang as Lang;
  if (acceptLanguage) {
    const primary = acceptLanguage.split(",")[0].split("-")[0].toLowerCase();
    if (supported.includes(primary as Lang)) return primary as Lang;
  }
  return "en";
};
