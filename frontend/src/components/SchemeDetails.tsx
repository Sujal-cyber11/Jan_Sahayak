// Scheme Details page: eligibility per condition, plain-language who-can-
// apply text, benefits, last date, documents, how to apply, and the
// user's SELF-REPORTED application status (never verified against
// government systems). Senior-friendly: large controls, high contrast,
// words + icons (never colour alone).

import { useEffect, useState } from "react";
import { getSchemeDetails, putApplicationStatus } from "../api/client";
import { useLanguage } from "../i18n";
import type { ApplicationStatus, SchemeDetails } from "../types";

const STATUS_BADGES: Record<
  ApplicationStatus,
  { icon: string; className: string }
> = {
  NOT_APPLIED: { icon: "○", className: "bg-slate-200 text-slate-900" },
  APPLIED: { icon: "✓", className: "bg-blue-100 text-blue-900" },
  UNDER_REVIEW: { icon: "⏳", className: "bg-amber-100 text-amber-900" },
  APPROVED: { icon: "✓", className: "bg-green-100 text-green-900" },
  REJECTED: { icon: "✗", className: "bg-red-100 text-red-900" },
};

const STATUS_ORDER: ApplicationStatus[] = [
  "APPLIED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
];

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { t } = useLanguage();
  const badge = STATUS_BADGES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`}
    >
      <span aria-hidden="true">{badge.icon}</span>
      {t(`status.${status}`)}
    </span>
  );
}

function daysUntilDeadline(iso: string): number {
  const ms = new Date(`${iso}T00:00:00`).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function SchemeDetailsPage({
  schemeId,
  profileId,
  onBack,
}: {
  schemeId: number;
  profileId: number;
  onBack: () => void;
}) {
  const { lang, t } = useLanguage();
  const [details, setDetails] = useState<SchemeDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  useEffect(() => {
    setDetails(null);
    setError(null);
    setShowStatusPicker(false);
    getSchemeDetails(schemeId, profileId)
      .then(setDetails)
      .catch(() => setError("server"));
  }, [schemeId, profileId]);

  async function saveStatus(next: ApplicationStatus) {
    if (!details) return;
    // Confirm before moving away from a self-reported "Approved".
    if (
      details.application_status === "APPROVED" &&
      next !== "APPROVED" &&
      !window.confirm(t("confirmApproved"))
    ) {
      return;
    }
    setBusy(true);
    setSavedNote(null);
    try {
      await putApplicationStatus(profileId, schemeId, next);
      const fresh = await getSchemeDetails(schemeId, profileId);
      setDetails(fresh);
      setSavedNote(t("statusSaved"));
      setShowStatusPicker(false);
    } catch {
      setError("server");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-6">
        <p className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
          {t(`error.${error}`)}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 min-h-12 w-full rounded-lg border border-gray-400 px-4 py-3 text-lg font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500"
        >
          {t("back")}
        </button>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-6">
        <p className="text-lg text-gray-800" role="status">
          {t("checking")}
        </p>
      </main>
    );
  }

  const name = lang === "hi" ? details.name_hi : details.name_en;
  const steps =
    lang === "hi" ? details.application_steps_hi : details.application_steps_en;
  const deadlineSoon =
    details.application_deadline !== null &&
    daysUntilDeadline(details.application_deadline) <= 30;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <button
        type="button"
        onClick={onBack}
        className="no-print mb-4 min-h-12 w-full rounded-lg border border-gray-400 px-4 py-3 text-lg font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500"
      >
        ← {t("back")}
      </button>

      <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
      <p className="mt-1 text-base text-gray-700">
        {details.ministry} · {details.state}
      </p>

      {details.needs_rechecking && (
        <div className="mt-4 rounded-lg border-2 border-amber-400 bg-amber-50 p-3">
          <p className="text-base font-semibold text-amber-900">
            ⚠ {t("unverifiedBadge")} — {t("unverifiedNote")}
          </p>
        </div>
      )}

      {/* 1. Am I eligible? */}
      <section className="mt-6">
        <h3 className="text-xl font-bold text-gray-900">{t("amIEligible")}</h3>
        <div className="mt-2">
          {details.overall === "ELIGIBLE" && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-base font-semibold text-green-900">
              ✓ {t("eligibleCount")}
            </span>
          )}
          {details.overall === "UNCERTAIN" && (
            <span className="rounded-full bg-slate-200 px-3 py-1 text-base font-semibold text-slate-900">
              ? {t("uncertainCount")}
            </span>
          )}
          {details.overall === "INELIGIBLE" && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-base font-semibold text-red-900">
              ✗ {t("ineligibleCount")}
            </span>
          )}
        </div>
        <ul className="mt-3 space-y-2">
          {details.criteria.map((c) => (
            <li
              key={c.criterion}
              className="rounded-lg border border-gray-300 bg-white p-3"
            >
              <div className="flex items-start gap-2">
                <span
                  className={`text-lg font-bold ${
                    c.status === "PASS"
                      ? "text-green-800"
                      : c.status === "FAIL"
                        ? "text-red-800"
                        : "text-amber-800"
                  }`}
                  aria-hidden="true"
                >
                  {t(`icon.${c.status}`)}
                </span>
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {lang === "hi" ? c.label_hi : c.label_en}
                  </p>
                  <p className="mt-0.5 text-base text-gray-800">
                    {lang === "hi" ? c.explanation_hi : c.explanation_en}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. Who can apply */}
      <section className="mt-6">
        <h3 className="text-xl font-bold text-gray-900">{t("whoCanApply")}</h3>
        <div className="mt-2 space-y-2">
          <p className="rounded-lg border border-gray-300 bg-white p-3 text-lg text-gray-900">
            <span className="font-semibold">{t("q_age")}</span>{" "}
            {details.age_limit_text ?? "—"}
          </p>
          <p className="rounded-lg border border-gray-300 bg-white p-3 text-lg text-gray-900">
            <span className="font-semibold">{t("q_income")}</span>{" "}
            {details.income_limit_text ?? "—"}
          </p>
        </div>
      </section>

      {/* 3. Benefits */}
      <section className="mt-6">
        <h3 className="text-xl font-bold text-gray-900">{t("benefits")}</h3>
        <p className="mt-2 rounded-lg border border-gray-300 bg-white p-3 text-lg text-gray-900">
          {lang === "hi" ? details.benefits_hi : details.benefits_en}
        </p>
      </section>

      {/* 4. Last date */}
      <section className="mt-6">
        <h3 className="text-xl font-bold text-gray-900">{t("lastDate")}</h3>
        {details.application_deadline ? (
          <p
            className={`mt-2 rounded-lg border p-3 text-lg ${
              deadlineSoon
                ? "border-red-400 bg-red-50 font-semibold text-red-900"
                : "border-gray-300 bg-white text-gray-900"
            }`}
          >
            {details.application_deadline}
            {deadlineSoon && ` — ${t("deadlineSoon")}`}
          </p>
        ) : (
          <p className="mt-2 rounded-lg border border-gray-300 bg-white p-3 text-lg text-gray-900">
            {t("noDeadline")}
          </p>
        )}
        {details.deadline_note && (
          <p className="mt-1 text-base text-gray-800">{details.deadline_note}</p>
        )}
      </section>

      {/* 5. Documents */}
      <section className="mt-6">
        <h3 className="text-xl font-bold text-gray-900">{t("mandatoryDocs")}</h3>
        <ul className="mt-2 space-y-2">
          {details.mandatory_documents.map((doc) => (
            <li
              key={doc.id}
              className="rounded-lg border-2 border-gray-400 bg-white p-3"
            >
              <p className="text-lg font-bold text-gray-900">
                {lang === "hi" ? doc.name_hi : doc.name_en}
              </p>
              <p className="mt-1 text-base text-gray-800">
                {lang === "hi" ? doc.instructions_hi : doc.instructions_en}
              </p>
            </li>
          ))}
        </ul>
        {details.optional_documents.length > 0 && (
          <>
            <h3 className="mt-4 text-xl font-bold text-gray-700">
              {t("optionalDocs")}
            </h3>
            <ul className="mt-2 space-y-2">
              {details.optional_documents.map((doc) => (
                <li key={doc.id} className="rounded-lg bg-gray-100 p-3">
                  <p className="text-lg font-semibold text-gray-900">
                    {lang === "hi" ? doc.name_hi : doc.name_en}
                  </p>
                  <p className="mt-1 text-base text-gray-800">
                    {lang === "hi" ? doc.instructions_hi : doc.instructions_en}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* 6. How to apply */}
      <section className="mt-6">
        <h3 className="text-xl font-bold text-gray-900">{t("howToApply")}</h3>
        <ol className="mt-2 list-decimal space-y-2 pl-6 text-lg text-gray-900">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <a
          href={details.official_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex min-h-12 w-full items-center justify-center rounded-lg bg-blue-800 px-4 py-3 text-lg font-bold text-white hover:bg-blue-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500"
        >
          {t("officialPortal")} ↗
        </a>
      </section>

      {/* 7. My application status (self-reported) */}
      <section className="mt-6 no-print">
        <h3 className="text-xl font-bold text-gray-900">{t("myStatus")}</h3>
        <div className="mt-2">
          <StatusBadge status={details.application_status} />
        </div>
        {details.application_updated_at && (
          <p className="mt-1 text-base text-gray-800">
            {t("lastUpdated")}:{" "}
            {new Date(details.application_updated_at).toLocaleDateString()}
          </p>
        )}
        <p className="mt-2 rounded-lg bg-blue-50 p-3 text-base text-blue-900">
          {t("selfReportedNote")}
        </p>
        {savedNote && (
          <p className="mt-2 text-base font-semibold text-green-900" role="status">
            ✓ {savedNote}
          </p>
        )}

        {details.application_status === "NOT_APPLIED" && !showStatusPicker && (
          <>
            <p className="mt-4 text-lg font-semibold text-gray-900">
              {t("appliedQuestion")}
            </p>
            <div className="mt-2 space-y-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowStatusPicker(true)}
                className="min-h-12 w-full rounded-lg bg-blue-800 px-4 py-3 text-lg font-bold text-white hover:bg-blue-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 disabled:opacity-50"
              >
                ✓ {t("yesApplied")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveStatus("NOT_APPLIED")}
                className="min-h-12 w-full rounded-lg border-2 border-gray-400 px-4 py-3 text-lg font-bold text-gray-900 hover:bg-gray-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 disabled:opacity-50"
              >
                ○ {t("notYet")}
              </button>
            </div>
          </>
        )}

        {(showStatusPicker || details.application_status !== "NOT_APPLIED") && (
          <div className="mt-4">
            <p className="text-lg font-semibold text-gray-900">
              {t("pickStatus")}
            </p>
            <div className="mt-2 space-y-3">
              {STATUS_ORDER.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={busy || status === details.application_status}
                  onClick={() => void saveStatus(status)}
                  className={`min-h-12 w-full rounded-lg px-4 py-3 text-lg font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 disabled:opacity-50 ${
                    status === details.application_status
                      ? "bg-gray-200 text-gray-700"
                      : "border-2 border-gray-400 bg-white text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <span aria-hidden="true">{STATUS_BADGES[status].icon}</span>{" "}
                  {t(`status.${status}`)}
                  {status === details.application_status ? " ✓" : ""}
                </button>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveStatus("NOT_APPLIED")}
                className="min-h-12 w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 disabled:opacity-50"
              >
                ○ {t("status.NOT_APPLIED")}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
