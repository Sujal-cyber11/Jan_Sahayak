// App shell: header with language picker, profile wizard, then the results
// page (dashboard counts + scheme cards). Uses only the existing backend
// API: POST /match, GET /schemes/{id} and GET /health.
//
// Errors are shown as friendly translated messages; raw errors are never
// displayed to the user.

import { useEffect, useState } from "react";
import {
  ApiError,
  getActionPlan,
  getHealth,
  getScheme,
  postMatch,
} from "./api/client";
import ActionPlan from "./components/ActionPlan";
import LanguagePicker from "./components/LanguagePicker";
import MySchemes from "./components/MySchemes";
import Results from "./components/Results";
import SchemeDetailsPage from "./components/SchemeDetails";
import Wizard from "./components/Wizard";
import { EMPTY_ANSWERS, toPayload } from "./constants";
import { useLanguage } from "./i18n";
import type { ActionPlanResponse, Answers, CardData } from "./types";

type Screen = "wizard" | "results" | "plan" | "details" | "myschemes";

const FONT_SIZES = [18, 20, 22] as const;
const FONT_KEY = "jansahayak.fontsize";

export default function App() {
  const { t } = useLanguage();

  const [screen, setScreen] = useState<Screen>("wizard");
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [cards, setCards] = useState<CardData[]>([]);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [plan, setPlan] = useState<ActionPlanResponse | null>(null);
  const [detailsSchemeId, setDetailsSchemeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Senior-friendly text size: 18px base (accessible minimum), A+/A-
  // control that persists across visits.
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = Number(localStorage.getItem(FONT_KEY));
    return (FONT_SIZES as readonly number[]).includes(saved) ? saved : 18;
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem(FONT_KEY, String(fontSize));
  }, [fontSize]);

  // GROQ key check for the AI assistant (stage 6) - non-blocking.
  const [groqOk, setGroqOk] = useState<boolean | null>(null);
  const [keyNoticeDismissed, setKeyNoticeDismissed] = useState(false);

  useEffect(() => {
    getHealth()
      .then((health) => setGroqOk(health.groq_configured))
      .catch(() => setGroqOk(null)); // wizard errors already cover this
  }, []);

  // Run the final match, then fetch each scheme's full record for the cards.
  async function runMatch(current: Answers) {
    setLoading(true);
    setErrorCode(null);
    try {
      const match = await postMatch({ profile: toPayload(current) });
      setProfileId(match.profile_id);
      const details = await Promise.all(
        match.results.map((result) => getScheme(result.scheme_id)),
      );
      const byId = new Map(details.map((detail) => [detail.id, detail]));
      setCards(
        match.results.map((result) => ({
          match: result,
          detail: byId.get(result.scheme_id)!,
        })),
      );
      setScreen("results");
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "server");
    } finally {
      setLoading(false);
    }
  }

  function handleComplete(current: Answers) {
    setAnswers(current);
    void runMatch(current);
  }

  // Load the action plan for the current profile (results -> plan).
  async function openActionPlan() {
    if (profileId === null) return;
    setLoading(true);
    setErrorCode(null);
    try {
      const data = await getActionPlan(profileId);
      setPlan(data);
      setScreen("plan");
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "server");
    } finally {
      setLoading(false);
    }
  }

  function openDetails(schemeId: number) {
    setDetailsSchemeId(schemeId);
    setScreen("details");
  }

  const showKeyNotice = groqOk === false && !keyNoticeDismissed;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <header className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-blue-800">{t("appName")}</h1>
          <p className="text-xs text-gray-600">{t("tagline")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profileId !== null && (
            <button
              type="button"
              onClick={() => setScreen("myschemes")}
              className="min-h-12 rounded-lg border-2 border-gray-400 px-3 py-2 text-sm font-bold text-gray-900 hover:bg-gray-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500"
            >
              {t("mySchemes")}
            </button>
          )}
          {/* Text size: large labelled buttons, persisted. */}
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label={t("textSizeLabel")}
          >
            <button
              type="button"
              onClick={() =>
                setFontSize(
                  FONT_SIZES[Math.max(0, FONT_SIZES.indexOf(fontSize as 18 | 20 | 22) - 1)],
                )
              }
              disabled={fontSize === FONT_SIZES[0]}
              aria-label={t("textSmaller")}
              className="min-h-12 min-w-12 rounded-lg border-2 border-gray-400 px-2 text-sm font-bold text-gray-900 hover:bg-gray-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 disabled:opacity-40"
            >
              A−
            </button>
            <button
              type="button"
              onClick={() =>
                setFontSize(
                  FONT_SIZES[
                    Math.min(
                      FONT_SIZES.length - 1,
                      FONT_SIZES.indexOf(fontSize as 18 | 20 | 22) + 1,
                    )
                  ],
                )
              }
              disabled={fontSize === FONT_SIZES[FONT_SIZES.length - 1]}
              aria-label={t("textBigger")}
              className="min-h-12 min-w-12 rounded-lg border-2 border-gray-400 px-2 text-sm font-bold text-gray-900 hover:bg-gray-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 disabled:opacity-40"
            >
              A+
            </button>
          </div>
          <LanguagePicker />
        </div>
      </header>

      {showKeyNotice && (
        <div
          role="status"
          className="no-print flex items-start justify-between gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900"
        >
          <p>{t("apiKeyMissing")}</p>
          <button
            type="button"
            onClick={() => setKeyNoticeDismissed(true)}
            className="min-h-11 shrink-0 rounded px-2 font-medium underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {t("apiKeyDismiss")}
          </button>
        </div>
      )}

      <div className="flex-1">
        {loading && (
          <main
            role="status"
            aria-live="polite"
            className="mx-auto flex w-full max-w-md flex-col items-center gap-3 px-4 py-16 text-gray-600"
          >
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />
            <p className="text-sm">{t("loadingResults")}</p>
          </main>
        )}

        {!loading && errorCode && (
          <main
            role="alert"
            className="mx-auto w-full max-w-md px-4 py-16 text-center"
          >
            <p className="text-sm text-red-700">{t(`error.${errorCode}`)}</p>
            <button
              type="button"
              onClick={() => void runMatch(answers)}
              className="mt-4 min-h-12 rounded-lg bg-blue-800 px-6 font-medium text-white hover:bg-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {t("retry")}
            </button>
          </main>
        )}

        {!loading && !errorCode && screen === "wizard" && (
          <Wizard initialAnswers={answers} onComplete={handleComplete} />
        )}

        {!loading && !errorCode && screen === "results" && cards.length === 0 && (
          <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
            <p className="text-sm text-gray-700">{t("error.empty")}</p>
            <button
              type="button"
              onClick={() => setScreen("wizard")}
              className="mt-4 min-h-12 rounded-lg bg-blue-800 px-6 font-medium text-white hover:bg-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {t("editProfile")}
            </button>
          </main>
        )}

        {!loading && !errorCode && screen === "results" && cards.length > 0 && (
          <Results
            cards={cards}
            onEdit={() => setScreen("wizard")}
            onActionPlan={() => void openActionPlan()}
            onOpenDetails={openDetails}
          />
        )}

        {!loading && !errorCode && screen === "plan" && plan && (
          <ActionPlan plan={plan} onBack={() => setScreen("results")} />
        )}

        {!loading &&
          !errorCode &&
          screen === "details" &&
          detailsSchemeId !== null &&
          profileId !== null && (
            <SchemeDetailsPage
              schemeId={detailsSchemeId}
              profileId={profileId}
              onBack={() => setScreen(profileId ? "results" : "wizard")}
            />
          )}

        {!loading &&
          !errorCode &&
          screen === "myschemes" &&
          profileId !== null && (
            <MySchemes profileId={profileId} onOpenDetails={openDetails} />
          )}
      </div>

      <footer className="no-print border-t border-gray-200 bg-white px-4 py-3">
        <p className="mx-auto max-w-md text-xs text-gray-600">
          {t("privacyNote")}
        </p>
      </footer>
    </div>
  );
}
