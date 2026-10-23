"""Deterministic eligibility engine (HARD RULES 1-2).

Every check is decided here, in plain Python, from the stored
(criterion, operator, threshold) rules. The LLM is never involved.

Each criterion returns PASS / FAIL / INFO_REQUIRED with a plain
explanation. The overall result is ELIGIBLE / INELIGIBLE / UNCERTAIN.

Income is collected as a RANGE BAND. When a band straddles a rule's
threshold, the engine returns INFO_REQUIRED instead of guessing, so the
overall result becomes UNCERTAIN until the user gives an exact income.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Optional

PASS = "PASS"
FAIL = "FAIL"
INFO_REQUIRED = "INFO_REQUIRED"

ELIGIBLE = "ELIGIBLE"
INELIGIBLE = "INELIGIBLE"
UNCERTAIN = "UNCERTAIN"

# Income bands: key -> (min inclusive, max exclusive). Bands do not overlap;
# "above_1200000" has no upper limit.
INCOME_BANDS: dict[str, tuple[float, float]] = {
    "below_50000": (0.0, 50000.0),
    "50000_100000": (50000.0, 100000.0),
    "100000_250000": (100000.0, 250000.0),
    "250000_600000": (250000.0, 600000.0),
    "600000_1200000": (600000.0, 1200000.0),
    "above_1200000": (1200000.0, float("inf")),
}

# Criteria satisfied from the profile's income band rather than a scalar.
INCOME_CRITERIA = {"annual_income", "family_income", "income_range"}

# Criteria that map onto fixed UserProfile columns.
COLUMN_CRITERIA = {"age", "state", "education_level", "occupation"}


@dataclass
class CriterionResult:
    criterion: str
    label_en: str
    label_hi: str
    status: str  # PASS / FAIL / INFO_REQUIRED
    explanation_en: str
    explanation_hi: str


@dataclass
class SchemeMatch:
    scheme_id: int
    slug: str
    name_en: str
    name_hi: str
    overall: str  # ELIGIBLE / INELIGIBLE / UNCERTAIN
    criteria: list[CriterionResult]


def profile_value(profile, criterion: str) -> tuple[bool, Any]:
    """Return (found, value). found=False means the user has not provided it."""
    if criterion in COLUMN_CRITERIA:
        value = getattr(profile, criterion, None)
        return value is not None, value
    if criterion in INCOME_CRITERIA:
        return profile.income_range is not None, profile.income_range
    # Any other criterion lives in the profile's extra answers (JSON).
    extra = json.loads(profile.extra_json) if profile.extra_json else {}
    if criterion in extra:
        return True, extra[criterion]
    return False, None


def _as_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def compare_scalar(value: Any, operator: str, threshold: str) -> Optional[bool]:
    """Compare a scalar answer. None means 'cannot decide' -> INFO_REQUIRED."""
    if isinstance(value, bool):
        text = "true" if value else "false"
    else:
        text = str(value)

    if operator == "==":
        return text == str(threshold)
    if operator == "!=":
        return text != str(threshold)
    if operator == "in":
        return text in [part.strip() for part in threshold.split(",")]

    number = _as_float(value)
    limit = _as_float(threshold)
    if number is None or limit is None:
        return None
    if operator == ">=":
        return number >= limit
    if operator == "<=":
        return number <= limit
    if operator == ">":
        return number > limit
    if operator == "<":
        return number < limit
    return None


def income_band_status(band_key: str, operator: str, threshold: float) -> str:
    """PASS / FAIL / INFO_REQUIRED for an income band against a limit.

    If the threshold falls inside the band, the answer could go either way,
    so we return INFO_REQUIRED (never guess).
    """
    if band_key not in INCOME_BANDS:
        return INFO_REQUIRED  # unknown band is treated as missing information
    lo, hi = INCOME_BANDS[band_key]

    if operator == "<=":
        if hi <= threshold:
            return PASS
        if lo > threshold:
            return FAIL
        return INFO_REQUIRED  # lo <= threshold < hi: straddles
    if operator == "<":
        if hi <= threshold:
            return PASS
        if lo >= threshold:
            return FAIL
        return INFO_REQUIRED
    if operator == ">=":
        if lo >= threshold:
            return PASS
        if hi <= threshold:
            return FAIL
        return INFO_REQUIRED
    if operator == ">":
        if lo > threshold:
            return PASS
        if hi <= threshold:
            return FAIL
        return INFO_REQUIRED
    if operator == "==":
        # A band can never PROVE an exact match, only rule it out.
        if lo <= threshold < hi:
            return INFO_REQUIRED
        return FAIL
    return INFO_REQUIRED


def _band_label(band_key: str) -> str:
    """Human label for an income band, e.g. 'Rs. 1,00,000 - 2,50,000'."""
    lo, hi = INCOME_BANDS[band_key]
    if hi == float("inf"):
        return f"Rs. {lo:,.0f} and above"
    return f"Rs. {lo:,.0f} - {hi:,.0f}"


def evaluate_rule(rule, profile) -> CriterionResult:
    """Evaluate one stored rule against a profile. Never uses an LLM."""
    found, value = profile_value(profile, rule.criterion)

    # Missing field: name exactly which field is needed.
    if not found:
        return CriterionResult(
            criterion=rule.criterion,
            label_en=rule.label_en,
            label_hi=rule.label_hi,
            status=INFO_REQUIRED,
            explanation_en=(
                f"Information needed: please provide the field "
                f"'{rule.criterion}' ({rule.label_en})."
            ),
            explanation_hi=(
                f"जानकारी आवश्यक: कृपया '{rule.criterion}' फ़ील्ड भरें "
                f"({rule.label_hi})।"
            ),
        )

    # Income band rules: decide PASS/FAIL/INFO via band geometry.
    if rule.criterion in INCOME_CRITERIA:
        status = income_band_status(value, rule.operator, float(rule.threshold))
        if status == INFO_REQUIRED:
            return CriterionResult(
                criterion=rule.criterion,
                label_en=rule.label_en,
                label_hi=rule.label_hi,
                status=INFO_REQUIRED,
                explanation_en=(
                    f"Your income band {_band_label(value)} spans the limit "
                    f"Rs. {float(rule.threshold):,.0f}. Please provide your "
                    "exact annual income to decide this criterion."
                ),
                explanation_hi=(
                    f"आपकी आय सीमा {_band_label(value)} में सीमा रु. "
                    f"{float(rule.threshold):,.0f} शामिल है। इस शर्त को "
                    "तय करने के लिए कृपया अपनी सटीक वार्षिक आय दें।"
                ),
            )
        explanation_en = (
            rule.pass_explanation_en if status == PASS else rule.fail_explanation_en
        )
        explanation_hi = (
            rule.pass_explanation_hi if status == PASS else rule.fail_explanation_hi
        )
        return CriterionResult(
            criterion=rule.criterion,
            label_en=rule.label_en,
            label_hi=rule.label_hi,
            status=status,
            explanation_en=explanation_en,
            explanation_hi=explanation_hi,
        )

    # Scalar / categorical rules.
    outcome = compare_scalar(value, rule.operator, rule.threshold)
    if outcome is None:
        return CriterionResult(
            criterion=rule.criterion,
            label_en=rule.label_en,
            label_hi=rule.label_hi,
            status=INFO_REQUIRED,
            explanation_en=(
                f"Could not compare your answer '{value}' with the required "
                f"limit '{rule.threshold}'. Please provide a numeric value."
            ),
            explanation_hi=(
                f"आपका उत्तर '{value}' आवश्यक सीमा '{rule.threshold}' से "
                "तुलना योग्य नहीं है। कृपया संख्यात्मक मान दें।"
            ),
        )
    status = PASS if outcome else FAIL
    explanation_en = (
        rule.pass_explanation_en if outcome else rule.fail_explanation_en
    )
    explanation_hi = (
        rule.pass_explanation_hi if outcome else rule.fail_explanation_hi
    )
    return CriterionResult(
        criterion=rule.criterion,
        label_en=rule.label_en,
        label_hi=rule.label_hi,
        status=status,
        explanation_en=explanation_en,
        explanation_hi=explanation_hi,
    )


def overall_status(criteria: list[CriterionResult]) -> str:
    """ELIGIBLE if all pass, INELIGIBLE if any fails, else UNCERTAIN."""
    if any(c.status == FAIL for c in criteria):
        return INELIGIBLE
    if all(c.status == PASS for c in criteria):
        return ELIGIBLE
    return UNCERTAIN


def evaluate_scheme(scheme, profile) -> SchemeMatch:
    criteria = [evaluate_rule(rule, profile) for rule in scheme.rules]
    return SchemeMatch(
        scheme_id=scheme.id,
        slug=scheme.slug,
        name_en=scheme.name_en,
        name_hi=scheme.name_hi,
        overall=overall_status(criteria),
        criteria=criteria,
    )


def evaluate_all(schemes, profile) -> list[SchemeMatch]:
    return [evaluate_scheme(scheme, profile) for scheme in schemes]
