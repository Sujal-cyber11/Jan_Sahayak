// Language picker: two large segmented buttons (EN / हिन्दी).
// The choice is persisted by the LanguageProvider.

import { useLanguage } from "../i18n";

export default function LanguagePicker() {
  const { lang, setLang, t } = useLanguage();

  const base =
    "min-h-11 px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
  const active = "bg-blue-800 text-white";
  const inactive = "bg-white text-gray-700 hover:bg-gray-100";

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="flex overflow-hidden rounded-lg border border-gray-300"
    >
      <button
        type="button"
        aria-pressed={lang === "en"}
        onClick={() => setLang("en")}
        className={`${base} ${lang === "en" ? active : inactive}`}
      >
        English
      </button>
      <button
        type="button"
        aria-pressed={lang === "hi"}
        onClick={() => setLang("hi")}
        className={`${base} ${lang === "hi" ? active : inactive}`}
      >
        हिन्दी
      </button>
    </div>
  );
}
