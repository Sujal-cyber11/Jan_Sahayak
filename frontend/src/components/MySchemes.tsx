// "My Schemes": two large toggles — Already applied (self-reported) and
// Yet to apply (eligible/uncertain, still NOT_APPLIED) with the count of
// documents still to collect and a Start button into the details page.

import { useEffect, useState } from "react";
import { getActionPlan, listApplications, postMatch } from "../api/client";
import { StatusBadge } from "./SchemeDetails";
import { useLanguage } from "../i18n";
import type { ActionPlanResponse, ApplicationRow } from "../types";

interface YetToApplyItem {
  scheme_id: number;
  slug: string;
  name_en: string;
  name_hi: string;
  overall: "ELIGIBLE" | "UNCERTAIN";
  missingMandatory: number;
}

export default function MySchemes({
  profileId,
  onOpenDetails,
}: {
  profileId: number;
  onOpenDetails: (schemeId: number) => void;
}) {
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState<"applied" | "yet">("applied");
  const [applied, setApplied] = useState<ApplicationRow[]>([]);
  const [yetToApply, setYetToApply] = useState<YetToApplyItem[]>([]);
  const [plan, setPlan] = useState<ActionPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listApplications(profileId, "applied"),
      postMatch({ profile_id: profileId }),
      getActionPlan(profileId),
    ])
      .then(([apps, match, actionPlan]) => {
        if (cancelled) return;
        setApplied(apps);
        setPlan(actionPlan);
        const appliedIds = new Set(apps.map((a) => a.scheme_id));
        const missingById = new Map(
          actionPlan.priority_schemes.map((p) => [p.scheme_id, p]),
        );
        const uncertainById = new Map(
          actionPlan.uncertain_schemes.map((u) => [u.scheme_id, u]),
        );
        const items: YetToApplyItem[] = [];
        for (const result of match.results) {
          if (appliedIds.has(result.scheme_id)) continue;
          if (result.overall !== "ELIGIBLE" && result.overall !== "UNCERTAIN") {
            continue;
          }
          const eligible = missingById.get(result.scheme_id);
          const uncertain = uncertainById.get(result.scheme_id);
          items.push({
            scheme_id: result.scheme_id,
            slug: result.slug,
            name_en: result.name_en,
            name_hi: result.name_hi,
            overall: result.overall,
            missingMandatory: eligible
              ? eligible.missing_mandatory_count
              : uncertain
                ? uncertain.documents_if_eligible.filter((d) => d.mandatory)
                    .length
                : 0,
          });
        }
        // Same deterministic order as the action plan: fewest missing first.
        items.sort((a, b) => a.missingMandatory - b.missingMandatory);
        setYetToApply(items);
      })
      .catch(() => {
        if (!cancelled) setYetToApply([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId, tab]);

  const appliedCount = applied.length;
  const yetCount = yetToApply.length;

  function TabButton({
    id,
    count,
  }: {
    id: "applied" | "yet";
    count: number;
  }) {
    const label = id === "applied" ? t("toggleApplied") : t("toggleYetToApply");
    const active = tab === id;
    return (
      <button
        type="button"
        onClick={() => setTab(id)}
        aria-pressed={active}
        className={`min-h-12 flex-1 rounded-lg px-3 py-3 text-base font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 ${
          active
            ? "bg-blue-800 text-white"
            : "border-2 border-gray-400 bg-white text-gray-900 hover:bg-gray-100"
        }`}
      >
        {label} ({count})
      </button>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <h2 className="mb-4 text-2xl font-bold text-gray-900">{t("mySchemes")}</h2>

      <div className="mb-4 flex gap-3" role="group" aria-label={t("mySchemes")}>
        <TabButton id="applied" count={appliedCount} />
        <TabButton id="yet" count={yetCount} />
      </div>

      {loading && (
        <p className="text-lg text-gray-800" role="status">
          {t("checking")}
        </p>
      )}

      {!loading && tab === "applied" && (
        <ul className="space-y-3">
          {applied.length === 0 && (
            <li className="rounded-lg border border-gray-300 bg-white p-4 text-lg text-gray-900">
              {t("noneInList")}
            </li>
          )}
          {applied.map((row) => (
            <li
              key={row.scheme_id}
              className="rounded-xl border border-gray-300 bg-white p-4"
            >
              <p className="text-lg font-bold text-gray-900">
                {lang === "hi" ? row.name_hi : row.name_en}
              </p>
              <div className="mt-2">
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-2 text-base text-gray-800">
                {t("lastUpdated")}:{" "}
                {new Date(row.updated_at).toLocaleDateString()}
              </p>
              <button
                type="button"
                onClick={() => onOpenDetails(row.scheme_id)}
                className="mt-3 min-h-12 w-full rounded-lg border-2 border-gray-400 px-4 py-3 text-base font-bold text-gray-900 hover:bg-gray-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500"
              >
                {t("changeStatus")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && tab === "yet" && (
        <ul className="space-y-3">
          {yetToApply.length === 0 && (
            <li className="rounded-lg border border-gray-300 bg-white p-4 text-lg text-gray-900">
              {t("noneInList")}
            </li>
          )}
          {yetToApply.map((item) => (
            <li
              key={item.scheme_id}
              className="rounded-xl border border-gray-300 bg-white p-4"
            >
              <p className="text-lg font-bold text-gray-900">
                {lang === "hi" ? item.name_hi : item.name_en}
              </p>
              <p className="mt-1">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    item.overall === "ELIGIBLE"
                      ? "bg-green-100 text-green-900"
                      : "bg-slate-200 text-slate-900"
                  }`}
                >
                  {item.overall === "ELIGIBLE" ? "✓" : "?"}{" "}
                  {item.overall === "ELIGIBLE"
                    ? t("eligibleCount")
                    : t("uncertainCount")}
                </span>
              </p>
              <p className="mt-2 text-base text-gray-800">
                {t("missingDocs", { n: item.missingMandatory })}
              </p>
              {plan?.uncertain_schemes.some(
                (u) => u.scheme_id === item.scheme_id && u.needs_rechecking,
              ) && (
                <p className="mt-2 rounded bg-amber-100 px-2 py-1 text-sm text-amber-900">
                  ⚠ {t("unverifiedBadge")}
                </p>
              )}
              <button
                type="button"
                onClick={() => onOpenDetails(item.scheme_id)}
                className="mt-3 min-h-12 w-full rounded-lg bg-blue-800 px-4 py-3 text-base font-bold text-white hover:bg-blue-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500"
              >
                ▶ {t("startButton")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
