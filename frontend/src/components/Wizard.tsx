// Profile wizard: one question per step, large tap targets, mobile-first.
//
// The five core questions (state, age group, education, occupation, income
// band) are always asked. Afterwards the wizard runs a preliminary match
// and turns the engine's INFO_REQUIRED criteria into extra questions, so
// the user is only asked what some scheme actually needs. Skipping an extra
// question leaves it unanswered and the scheme stays UNCERTAIN.

import { useState } from "react";
import { postMatch } from "../api/client";
import {
  AGE_GROUPS,
  EDUCATION_LEVELS,
  EXTRA_FIELD_CONFIG,
  INCOME_BANDS,
  OCCUPATIONS,
  STATES,
  toPayload,
  type ExtraKind,
  type Option,
} from "../constants";
import { useLanguage, type Lang } from "../i18n";
import type { Answers, MatchResponse } from "../types";

type CoreKey = "state" | "age" | "education" | "occupation" | "income";

interface ExtraQuestion {
  criterion: string;
  label_en: string;
  label_hi: string;
  kind: ExtraKind;
  options?: string[];
}

type Step =
  | { kind: "core"; key: CoreKey }
  | { kind: "extra"; question: ExtraQuestion };

const CORE_STEPS: CoreKey[] = ["state", "age", "education", "occupation", "income"];

// Criteria answered by the core columns; everything else can be asked as an
// extra question.
const CORE_CRITERIA = new Set([
  "age",
  "state",
  "education_level",
  "occupation",
  "annual_income",
  "family_income",
  "income_range",
]);

function optionText(option: Option, lang: Lang): string {
  return lang === "hi" ? option.hi : option.en;
}

function questionText(question: ExtraQuestion, lang: Lang): string {
  return lang === "hi" ? question.label_hi : question.label_en;
}

function selectOptionLabel(
  t: (key: string) => string,
  criterion: string,
  value: string,
): string {
  const key = `opt.${criterion}.${value}`;
  const label = t(key);
  return label === key ? value : label;
}

function collectExtras(response: MatchResponse): ExtraQuestion[] {
  const seen = new Map<string, ExtraQuestion>();
  for (const result of response.results) {
    for (const criterion of result.criteria) {
      if (
        criterion.status !== "INFO_REQUIRED" ||
        CORE_CRITERIA.has(criterion.criterion) ||
        seen.has(criterion.criterion)
      ) {
        continue;
      }
      const config = EXTRA_FIELD_CONFIG[criterion.criterion] ?? {
        kind: "yesno" as const,
      };
      seen.set(criterion.criterion, {
        criterion: criterion.criterion,
        label_en: criterion.label_en,
        label_hi: criterion.label_hi,
        kind: config.kind,
        options: config.options,
      });
    }
  }
  return [...seen.values()];
}

// Number answers: a text input with a numeric keypad on mobile. The
// question text is a visible <label> tied to the input.
function NumberStep({
  question,
  onAnswer,
  onSkip,
}: {
  question: ExtraQuestion;
  onAnswer: (value: number) => void;
  onSkip: () => void;
}) {
  const { lang, t } = useLanguage();
  const [draft, setDraft] = useState("");
  const inputId = `num-${question.criterion}`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor={inputId}
          className="block text-lg font-semibold text-gray-900"
        >
          {questionText(question, lang)}
        </label>
        <input
          id={inputId}
          key={question.criterion}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
          className="min-h-14 w-full rounded-lg border border-gray-300 px-4 text-lg focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            const value = Number(draft);
            if (Number.isFinite(value) && draft !== "") onAnswer(value);
          }}
          className="min-h-12 flex-1 rounded-lg bg-blue-800 px-4 font-medium text-white hover:bg-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {t("next")}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="min-h-12 rounded-lg border border-gray-300 px-4 text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {t("skip")}
        </button>
      </div>
    </div>
  );
}

export default function Wizard({
  initialAnswers,
  onComplete,
}: {
  initialAnswers: Answers;
  onComplete: (answers: Answers) => void;
}) {
  const { lang, t } = useLanguage();

  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [steps, setSteps] = useState<Step[]>(
    CORE_STEPS.map((key) => ({ kind: "core", key })),
  );
  const [index, setIndex] = useState(0);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState(false);

  const extrasLoaded = steps.length > CORE_STEPS.length;
  const current = steps[index];

  async function advanceAfter(next: Answers, currentIndex: number) {
    // Not the last step: move on.
    if (currentIndex < steps.length - 1) {
      setIndex(currentIndex + 1);
      return;
    }
    // Extras already collected: we are done.
    if (extrasLoaded) {
      onComplete(next);
      return;
    }
    // Last core step: ask the engine what else is missing.
    setBuilding(true);
    setError(false);
    try {
      const response = await postMatch({ profile: toPayload(next) });
      const extras = collectExtras(response);
      if (extras.length === 0) {
        onComplete(next);
        return;
      }
      setSteps((prev) => [
        ...prev,
        ...extras.map((question) => ({ kind: "extra" as const, question })),
      ]);
      setIndex(currentIndex + 1);
    } catch {
      setError(true);
    } finally {
      setBuilding(false);
    }
  }

  function handleCoreAnswer(option: Option) {
    const key = (current as { kind: "core"; key: CoreKey }).key;
    const next: Answers = { ...answers };
    if (key === "age") {
      next.age = AGE_GROUPS.find((group) => group.key === option.key)?.age;
    } else if (key === "income") {
      next.income_range = option.key;
    } else if (key === "state") {
      next.state = option.key;
    } else if (key === "education") {
      next.education_level = option.key;
    } else {
      next.occupation = option.key;
    }
    setAnswers(next);
    void advanceAfter(next, index);
  }

  function handleExtraAnswer(value: string | number | boolean) {
    const question = (current as { kind: "extra"; question: ExtraQuestion }).question;
    const next: Answers = {
      ...answers,
      extra: { ...answers.extra, [question.criterion]: value },
    };
    setAnswers(next);
    void advanceAfter(next, index);
  }

  function handleSkip() {
    void advanceAfter(answers, index);
  }

  function optionsFor(key: CoreKey): Option[] {
    switch (key) {
      case "state":
        return STATES;
      case "age":
        return AGE_GROUPS;
      case "education":
        return EDUCATION_LEVELS;
      case "occupation":
        return OCCUPATIONS;
      case "income":
        return INCOME_BANDS;
    }
  }

  function renderOptionButton(option: Option) {
    const key = (current as { kind: "core"; key: CoreKey }).key;
    const fieldByKey: Record<CoreKey, keyof Answers> = {
      state: "state",
      age: "age",
      education: "education_level",
      occupation: "occupation",
      income: "income_range",
    };
    const selected =
      key === "age"
        ? AGE_GROUPS.find((group) => group.key === option.key)?.age === answers.age
        : answers[fieldByKey[key]] === option.key;
    return (
      <button
        key={option.key}
        type="button"
        onClick={() => handleCoreAnswer(option)}
        className={`min-h-14 w-full rounded-lg border px-4 text-left text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          selected
            ? "border-blue-700 bg-blue-50 text-blue-900"
            : "border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50"
        }`}
      >
        {optionText(option, lang)}
      </button>
    );
  }

  function renderStep() {
    if (current.kind === "core") {
      return (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {t(`q_${current.key}`)}
          </h2>
          <div
            className={
              current.key === "state"
                ? "max-h-[60vh] space-y-2 overflow-y-auto pr-1"
                : "space-y-2"
            }
          >
            {optionsFor(current.key).map(renderOptionButton)}
          </div>
        </div>
      );
    }

    const { question } = current;
    if (question.kind === "number") {
      return (
        <NumberStep
          question={question}
          onAnswer={handleExtraAnswer}
          onSkip={handleSkip}
        />
      );
    }

    if (question.kind === "select") {
      return (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {questionText(question, lang)}
          </h2>
          <div className="space-y-2">
            {(question.options ?? []).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleExtraAnswer(value)}
                className="min-h-14 w-full rounded-lg border border-gray-300 bg-white px-4 text-left text-base hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {selectOptionLabel(t, question.criterion, value)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="min-h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {t("skip")}
          </button>
        </div>
      );
    }

    // yesno
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {questionText(question, lang)}
        </h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleExtraAnswer(true)}
            className="min-h-14 flex-1 rounded-lg border border-gray-300 bg-white text-base font-medium hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {t("yes")}
          </button>
          <button
            type="button"
            onClick={() => handleExtraAnswer(false)}
            className="min-h-14 flex-1 rounded-lg border border-gray-300 bg-white text-base font-medium hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {t("no")}
          </button>
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="min-h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {t("skip")}
        </button>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
        <span>
          {extrasLoaded
            ? t("extraIntro")
            : t("wizardStep", { x: index + 1, y: steps.length })}
        </span>
        {index > 0 && !building && (
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className="min-h-11 rounded-lg border border-gray-300 px-3 text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {t("back")}
          </button>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {building && (
          <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-gray-500">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />
            <p className="text-sm">{t("checking")}</p>
          </div>
        )}
        {!building && error && (
          <div className="space-y-3">
            <p className="text-sm text-red-700">{t("matchError")}</p>
            <button
              type="button"
              onClick={() => void advanceAfter(answers, index)}
              className="min-h-12 w-full rounded-lg bg-blue-800 px-4 font-medium text-white hover:bg-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {t("retry")}
            </button>
          </div>
        )}
        {!building && !error && renderStep()}
      </div>
    </main>
  );
}
