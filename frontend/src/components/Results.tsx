// Results page: dashboard counts (eligible / uncertain / ineligible) and
// scheme cards ordered by usefulness: eligible first, then uncertain.
// A target-group filter hides cards only - it never changes eligibility.

import { useMemo, useState } from "react";
import { useLanguage } from "../i18n";
import type { CardData, OverallStatus } from "../types";
import SchemeCard from "./SchemeCard";

const ORDER: Record<OverallStatus, number> = {
  ELIGIBLE: 0,
  UNCERTAIN: 1,
  INELIGIBLE: 2,
};

export default function Results({
  cards,
  onEdit,
  onActionPlan,
  onOpenDetails,
}: {
  cards: CardData[];
  onEdit: () => void;
  onActionPlan: () => void;
  onOpenDetails: (schemeId: number) => void;
}) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<string>("all");

  const counts = {
    ELIGIBLE: 0,
    UNCERTAIN: 0,
    INELIGIBLE: 0,
  };
  for (const card of cards) counts[card.match.overall] += 1;

  const sorted = [...cards].sort(
    (a, b) => ORDER[a.match.overall] - ORDER[b.match.overall],
  );

  // Group chips are derived from the loaded cards (no hardcoded groups).
  const groups = useMemo(() => {
    const seen = new Set<string>();
    for (const card of cards) {
      for (const group of card.detail.target_groups) seen.add(group);
    }
    return [...seen].sort();
  }, [cards]);

  // Filtering is display-only; counts and eligibility stay untouched.
  const visible =
    filter === "all"
      ? sorted
      : sorted.filter((card) => card.detail.target_groups.includes(filter));

  const statStyle: Record<OverallStatus, string> = {
    ELIGIBLE: "bg-green-50 text-green-800",
    UNCERTAIN: "bg-slate-100 text-slate-700",
    INELIGIBLE: "bg-red-50 text-red-800",
  };

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">
          {t("dashboardTitle")}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onActionPlan}
            className="min-h-11 rounded-lg bg-blue-800 px-3 text-sm font-medium text-white hover:bg-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {t("actionPlan")}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {t("editProfile")}
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2" aria-label={t("dashboardTitle")}>
        {(["ELIGIBLE", "UNCERTAIN", "INELIGIBLE"] as const).map((status) => (
          <div
            key={status}
            className={`rounded-xl p-3 text-center ${statStyle[status]}`}
          >
            <div className="text-2xl font-bold">{counts[status]}</div>
            <div className="text-xs font-medium">
              {t(
                status === "ELIGIBLE"
                  ? "eligibleCount"
                  : status === "UNCERTAIN"
                    ? "uncertainCount"
                    : "ineligibleCount",
              )}
            </div>
          </div>
        ))}
      </div>

      {groups.length > 0 && (
        <div className="mb-4">
          <div
            role="group"
            aria-label={t("filterLabel")}
            className="flex gap-2 overflow-x-auto pb-1"
          >
            <button
              type="button"
              onClick={() => setFilter("all")}
              aria-pressed={filter === "all"}
              className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                filter === "all"
                  ? "bg-blue-800 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t("filterAll")}
            </button>
            {groups.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setFilter(group)}
                aria-pressed={filter === group}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  filter === group
                    ? "bg-blue-800 text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t(`groups.${group}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {visible.map((card) => (
          <SchemeCard
            key={card.detail.id}
            card={card}
            onOpenDetails={onOpenDetails}
          />
        ))}
      </div>
    </main>
  );
}
