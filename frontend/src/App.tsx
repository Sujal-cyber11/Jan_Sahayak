// Stage 1 landing page: proves the frontend, i18n, and backend link all work.

import { useState } from "react";
import { fetchHealth } from "./api/client";
import { useLanguage } from "./i18n";

type HealthState =
  | { kind: "idle" }
  | { kind: "ok"; schemes: number }
  | { kind: "error" };

export default function App() {
  const { lang, setLang, t } = useLanguage();
  const [health, setHealth] = useState<HealthState>({ kind: "idle" });

  async function checkHealth() {
    try {
      const result = await fetchHealth();
      setHealth({ kind: "ok", schemes: result.schemes });
    } catch {
      setHealth({ kind: "error" });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-blue-800">{t("appName")}</h1>
          <p className="text-sm text-gray-600">{t("tagline")}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setLang("en")}
            className={`rounded px-3 py-1 text-sm ${
              lang === "en" ? "bg-blue-800 text-white" : "bg-gray-100"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang("hi")}
            className={`rounded px-3 py-1 text-sm ${
              lang === "hi" ? "bg-blue-800 text-white" : "bg-gray-100"
            }`}
          >
            हिन्दी
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {t("stageNote")}
        </p>

        <section className="mt-8 rounded border border-gray-200 bg-white p-6">
          <h2 className="font-semibold">{t("backendStatus")}</h2>
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={checkHealth}
              className="rounded bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
            >
              {t("checkHealth")}
            </button>
            {health.kind === "ok" && (
              <p className="text-sm text-green-700">
                {t("connected")} — {health.schemes} {t("schemesLoaded")}
              </p>
            )}
            {health.kind === "error" && (
              <p className="text-sm text-red-700">{t("connectionFailed")}</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
