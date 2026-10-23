// "My Action Plan" page: priority ELIGIBLE schemes with mandatory
// paperwork, common documents (collect once), and uncertain schemes to
// complete. Read-only aggregation of backend data; the print stylesheet
// provides Print / Save as PDF.

import { useLanguage } from "../i18n";
import type {
  ActionPlanResponse,
  PlanDocument,
  PriorityScheme,
} from "../types";

function DocumentRow({ doc }: { doc: PlanDocument }) {
  const { lang, t } = useLanguage();
  return (
    <li
      className={`rounded-lg p-3 ${
        doc.mandatory ? "border border-gray-300 bg-white" : "bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-sm ${doc.mandatory ? "font-semibold text-gray-900" : "font-medium text-gray-600"}`}
        >
          {lang === "hi" ? doc.name_hi : doc.name_en}
          {!doc.mandatory && (
            <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-normal uppercase text-gray-600">
              {t("optionalDocs")}
            </span>
          )}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            doc.available
              ? "bg-green-100 text-green-800"
              : "bg-slate-200 text-slate-700"
          }`}
        >
          {doc.available ? t("haveIt") : t("toCollect")}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-600">
        {lang === "hi" ? doc.instructions_hi : doc.instructions_en}
      </p>
      {(doc.where_to_get || doc.typical_effort) && (
        <p className="mt-1 text-xs text-gray-600">
          {doc.where_to_get && (
            <span>
              <span className="font-medium">{t("howToGet")}:</span>{" "}
              {doc.where_to_get}
            </span>
          )}
          {doc.typical_effort && (
            <span>
              {" · "}
              <span className="font-medium">{t("typicalEffort")}:</span>{" "}
              {doc.typical_effort}
            </span>
          )}
        </p>
      )}
    </li>
  );
}

function PriorityCard({ scheme }: { scheme: PriorityScheme }) {
  const { lang, t } = useLanguage();
  const steps =
    lang === "hi" ? scheme.application_steps_hi : scheme.application_steps_en;
  const nextSteps = lang === "hi" ? scheme.next_steps_hi : scheme.next_steps_en;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900">
          {lang === "hi" ? scheme.name_hi : scheme.name_en}
        </h3>
        <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
          {t("eligibleCount")}
        </span>
      </div>

      {/* Never shown as claimable without the unverified-data notice. */}
      {scheme.needs_rechecking && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">
            {t("needsRechecking")}
          </span>
          <p className="mt-1.5 text-xs text-amber-900">{t("recheckNote")}</p>
        </div>
      )}

      <p className="mt-3 text-sm text-gray-700">
        {lang === "hi" ? scheme.benefits_hi : scheme.benefits_en}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <a
          href={scheme.official_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-700 underline hover:text-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {t("officialPortal")} ↗
        </a>
        <span className="text-gray-600">
          {t("readyCount", {
            a: scheme.documents_ready,
            b: scheme.documents_total,
          })}
        </span>
      </div>

      <section className="mt-4">
        <h4 className="text-sm font-semibold text-gray-900">
          {t("mandatoryDocs")}
        </h4>
        <ul className="mt-2 space-y-2">
          {scheme.mandatory_documents.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} />
          ))}
        </ul>
        {scheme.optional_documents.length > 0 && (
          <>
            <h4 className="mt-3 text-sm font-semibold text-gray-500">
              {t("optionalDocs")}
            </h4>
            <ul className="mt-2 space-y-2">
              {scheme.optional_documents.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="mt-4">
        <h4 className="text-sm font-semibold text-gray-900">
          {t("nextSteps")}
        </h4>
        <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">
          {nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </section>

      <section className="mt-4">
        <h4 className="text-sm font-semibold text-gray-900">
          {t("applicationSteps")}
        </h4>
        <ol className="mt-1 list-decimal pl-5 text-sm text-gray-700">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </article>
  );
}

export default function ActionPlan({
  plan,
  onBack,
}: {
  plan: ActionPlanResponse;
  onBack: () => void;
}) {
  const { lang, t } = useLanguage();

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 no-print">
        <h2 className="text-lg font-semibold text-gray-900">
          {t("actionPlan")}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {t("backToResults")}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-11 rounded-lg bg-blue-800 px-3 text-sm font-medium text-white hover:bg-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {t("printPlan")}
          </button>
        </div>
      </div>

      <p className="mb-4 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
        {t("progressNote")}
      </p>

      <section className="mb-6">
        <h3 className="mb-1 text-base font-semibold text-gray-900">
          {t("prioritySchemes")}
        </h3>
        <p className="mb-3 text-xs text-gray-600">{t("priorityHint")}</p>
        {plan.priority_schemes.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
            {t("noEligibleSchemes")}
          </p>
        ) : (
          <div className="space-y-4">
            {plan.priority_schemes.map((scheme) => (
              <PriorityCard key={scheme.scheme_id} scheme={scheme} />
            ))}
          </div>
        )}
      </section>

      {plan.common_documents.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-3 text-base font-semibold text-gray-900">
            {t("commonDocuments")}
          </h3>
          <ul className="space-y-2">
            {plan.common_documents.map((doc) => (
              <li
                key={doc.name_en}
                className="rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="text-sm font-semibold text-gray-900">
                  {lang === "hi" ? doc.name_hi : doc.name_en}
                </div>
                {doc.where_to_get && (
                  <p className="mt-1 text-xs text-gray-600">
                    <span className="font-medium">{t("howToGet")}:</span>{" "}
                    {doc.where_to_get}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-600">
                  <span className="font-medium">{t("usedBy")}:</span>{" "}
                  {doc.used_by
                    .map((scheme) =>
                      lang === "hi" ? scheme.name_hi : scheme.name_en,
                    )
                    .join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.uncertain_schemes.length > 0 && (
        <section>
          <h3 className="mb-3 text-base font-semibold text-gray-900">
            {t("uncertainSection")}
          </h3>
          <div className="space-y-4">
            {plan.uncertain_schemes.map((scheme) => (
              <article
                key={scheme.scheme_id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-base font-semibold text-gray-900">
                    {lang === "hi" ? scheme.name_hi : scheme.name_en}
                  </h4>
                  <span className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                    {t("uncertainCount")}
                  </span>
                </div>
                {scheme.needs_rechecking && (
                  <p className="mt-2 rounded bg-amber-100 px-2 py-1 text-xs text-amber-900">
                    {t("needsRechecking")} — {t("recheckNote")}
                  </p>
                )}
                <div className="mt-3">
                  <h5 className="text-sm font-semibold text-gray-700">
                    {t("missingFields")}
                  </h5>
                  <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">
                    {scheme.missing_fields.map((field) => (
                      <li key={field.criterion}>
                        {lang === "hi"
                          ? field.explanation_hi
                          : field.explanation_en}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-3">
                  <h5 className="text-sm font-semibold text-gray-700">
                    {t("docsIfEligible")}
                  </h5>
                  <ul className="mt-2 space-y-2">
                    {scheme.documents_if_eligible.map((doc) => (
                      <DocumentRow key={doc.id} doc={doc} />
                    ))}
                  </ul>
                </div>
                <a
                  href={scheme.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-blue-700 underline hover:text-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {t("officialPortal")} ↗
                </a>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
