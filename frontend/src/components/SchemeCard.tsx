// One scheme card: status badge, benefits, official link, last-verified
// date, an "Unverified data" badge when the record is not verified, and an
// expandable per-criterion list with the engine's explanations.

import { useState } from "react";
import { useLanguage, type Lang } from "../i18n";
import type { CardData, CriterionOut, OverallStatus } from "../types";

function formatDate(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const BADGE_STYLES: Record<OverallStatus, string> = {
  // Uncertain is deliberately neutral - it is NOT a failure.
  ELIGIBLE: "bg-green-100 text-green-800",
  UNCERTAIN: "bg-slate-200 text-slate-700",
  INELIGIBLE: "bg-red-100 text-red-800",
};

const CRITERION_STYLES: Record<CriterionOut["status"], string> = {
  PASS: "bg-green-100 text-green-800",
  FAIL: "bg-red-100 text-red-800",
  INFO_REQUIRED: "bg-slate-200 text-slate-700",
};

function CriteriaList({ criteria }: { criteria: CriterionOut[] }) {
  const { lang, t } = useLanguage();
  const statusText: Record<CriterionOut["status"], string> = {
    PASS: t("pass"),
    FAIL: t("fail"),
    INFO_REQUIRED: t("informationRequired"),
  };

  return (
    <ul className="mt-3 space-y-3">
      {criteria.map((criterion) => (
        <li key={criterion.criterion} className="rounded-lg bg-gray-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-800">
              {lang === "hi" ? criterion.label_hi : criterion.label_en}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${CRITERION_STYLES[criterion.status]}`}
            >
              {statusText[criterion.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {lang === "hi" ? criterion.explanation_hi : criterion.explanation_en}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function SchemeCard({
  card,
  onOpenDetails,
}: {
  card: CardData;
  onOpenDetails?: (schemeId: number) => void;
}) {
  const { lang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { match, detail } = card;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900">
          {lang === "hi" ? match.name_hi : match.name_en}
        </h3>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${BADGE_STYLES[match.overall]}`}
        >
          {t(
            match.overall === "ELIGIBLE"
              ? "eligibleCount"
              : match.overall === "UNCERTAIN"
                ? "uncertainCount"
                : "ineligibleCount",
          )}
        </span>
      </div>

      {detail.needs_rechecking && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">
            {t("needsRechecking")}
          </span>
          <p className="mt-1.5 text-xs text-amber-900">{t("recheckNote")}</p>
        </div>
      )}

      {detail.target_groups.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {detail.target_groups.map((group) => (
            <span
              key={group}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
            >
              {t(`groups.${group}`)}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-sm text-gray-700">
        <span className="font-medium">{t("benefits")}: </span>
        {lang === "hi" ? detail.benefits_hi : detail.benefits_en}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <a
          href={detail.official_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-700 underline hover:text-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {t("officialPortal")} ↗
        </a>
        <span className="text-gray-600">
          {t("lastVerified")}: {formatDate(detail.last_verified, lang)}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {onOpenDetails && (
          <button
            type="button"
            onClick={() => onOpenDetails(match.scheme_id)}
            className="min-h-11 w-full rounded-lg bg-blue-800 px-3 text-sm font-semibold text-white hover:bg-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {t("detailsTitle")}
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {open ? t("hideCriteria") : t("viewCriteria")}
        </button>
      </div>

      {open && <CriteriaList criteria={match.criteria} />}
    </article>
  );
}
