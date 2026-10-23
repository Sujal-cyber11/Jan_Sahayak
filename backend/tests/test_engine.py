"""Unit tests for the deterministic eligibility engine (stage 2).

Required coverage: band fully below/above a threshold, band straddling a
threshold, missing fields, wrong state, boundary values.
"""

import json
from types import SimpleNamespace

from app.engine import (
    ELIGIBLE,
    FAIL,
    INFO_REQUIRED,
    INELIGIBLE,
    PASS,
    UNCERTAIN,
    evaluate_rule,
    income_band_status,
    overall_status,
)


def make_rule(criterion, operator="<=", threshold="600000"):
    return SimpleNamespace(
        criterion=criterion,
        operator=operator,
        threshold=threshold,
        label_en=f"Test label ({criterion})",
        label_hi=f"टेस्ट लेबल ({criterion})",
        pass_explanation_en="You pass this test rule.",
        pass_explanation_hi="आप इस नियम में पास हैं।",
        fail_explanation_en="You fail this test rule.",
        fail_explanation_hi="आप इस नियम में फेल हैं।",
    )


def make_profile(income_range=None, age=None, state=None, extra=None):
    return SimpleNamespace(
        age=age,
        state=state,
        education_level=None,
        occupation=None,
        income_range=income_range,
        extra_json=json.dumps(extra) if extra else None,
    )


# --- Income band geometry -------------------------------------------------

def test_income_band_edges_are_documented_and_consistent():
    # Convention: every band is [min, max) - minimum INCLUSIVE, maximum
    # EXCLUSIVE (the next band takes over exactly at its min).
    from app.engine import INCOME_BANDS

    expected = [
        ("below_50000", 0.0, 50000.0),
        ("50000_100000", 50000.0, 100000.0),
        ("100000_250000", 100000.0, 250000.0),
        ("250000_600000", 250000.0, 600000.0),
        ("600000_1200000", 600000.0, 1200000.0),
        ("above_1200000", 1200000.0, float("inf")),
    ]
    for key, lo, hi in expected:
        print(f"{key}: min={lo} (inclusive), max={hi} (exclusive)")
        assert INCOME_BANDS[key] == (lo, hi)
    # Adjacent bands must not overlap and must share the exact edge value.
    for (_, _, prev_hi), (_, curr_lo, _) in zip(expected, expected[1:]):
        assert prev_hi == curr_lo

def test_le_and_lt_at_threshold_equal_to_band_min_edge():
    # Band "50000_100000" starts AT 50000 (inclusive).
    # <= 50000: contains values on both sides of the limit -> no guessing.
    assert income_band_status("50000_100000", "<=", 50000) == INFO_REQUIRED
    # < 50000: every value is >= 50000 -> FAIL.
    assert income_band_status("50000_100000", "<", 50000) == FAIL
    # Band "100000_250000" starts AT 100000 (inclusive), same geometry.
    assert income_band_status("100000_250000", "<=", 100000) == INFO_REQUIRED
    assert income_band_status("100000_250000", "<", 100000) == FAIL

def test_le_and_lt_at_threshold_equal_to_band_max_edge():
    # Band "below_50000" ends AT 50000 (exclusive): every value < 50000.
    assert income_band_status("below_50000", "<=", 50000) == PASS
    assert income_band_status("below_50000", "<", 50000) == PASS

def test_band_fully_below_threshold_passes():
    result = evaluate_rule(
        make_rule("annual_income", "<=", "600000"),
        make_profile(income_range="100000_250000"),
    )
    assert result.status == PASS


def test_band_fully_above_threshold_fails():
    result = evaluate_rule(
        make_rule("annual_income", "<=", "600000"),
        make_profile(income_range="above_1200000"),
    )
    assert result.status == FAIL


def test_band_straddling_threshold_returns_info():
    result = evaluate_rule(
        make_rule("annual_income", "<=", "600000"),
        make_profile(income_range="600000_1200000"),
    )
    assert result.status == INFO_REQUIRED
    assert "exact annual income" in result.explanation_en


def test_band_equal_operator_straddles_info_otherwise_fails():
    assert (
        income_band_status("100000_250000", "==", 150000) == INFO_REQUIRED
    )  # limit inside the band -> uncertain
    assert (
        income_band_status("below_50000", "==", 150000) == FAIL
    )  # limit outside -> ruled out


# --- Missing fields ---------------------------------------------------------

def test_missing_income_field_returns_info_and_names_the_field():
    result = evaluate_rule(make_rule("annual_income"), make_profile())
    assert result.status == INFO_REQUIRED
    assert "annual_income" in result.explanation_en


def test_missing_extra_field_returns_info_and_names_the_field():
    result = evaluate_rule(
        make_rule("is_farmer_family", "==", "true"), make_profile()
    )
    assert result.status == INFO_REQUIRED
    assert "is_farmer_family" in result.explanation_en


# --- State ------------------------------------------------------------------

def test_wrong_state_fails():
    rule = make_rule("state", "==", "Uttar Pradesh")
    assert evaluate_rule(rule, make_profile(state="Bihar")).status == FAIL


def test_matching_state_passes():
    rule = make_rule("state", "==", "Uttar Pradesh")
    assert evaluate_rule(rule, make_profile(state="Uttar Pradesh")).status == PASS


# --- Boundary values --------------------------------------------------------

def test_band_max_equal_to_threshold_passes():
    # Band [250000, 600000) vs <= 600000: every value is below the limit.
    result = evaluate_rule(
        make_rule("annual_income", "<=", "600000"),
        make_profile(income_range="250000_600000"),
    )
    assert result.status == PASS


def test_band_min_equal_to_threshold_is_straddle():
    # Band [600000, 1200000) vs <= 600000: contains values on both sides.
    result = evaluate_rule(
        make_rule("annual_income", "<=", "600000"),
        make_profile(income_range="600000_1200000"),
    )
    assert result.status == INFO_REQUIRED


def test_age_boundary_values():
    assert evaluate_rule(make_rule("age", ">=", "18"), make_profile(age=18)).status == PASS
    assert evaluate_rule(make_rule("age", ">=", "18"), make_profile(age=17)).status == FAIL
    assert evaluate_rule(make_rule("age", "<=", "40"), make_profile(age=40)).status == PASS
    assert evaluate_rule(make_rule("age", "<=", "40"), make_profile(age=41)).status == FAIL


def test_greater_than_band_boundary():
    # Band [250000, 600000) vs >= 250000: every value meets the limit.
    assert income_band_status("250000_600000", ">=", 250000) == PASS
    # Band [100000, 250000) vs >= 250000: every value is below the limit.
    assert income_band_status("100000_250000", ">=", 250000) == FAIL


# --- Overall status ---------------------------------------------------------

def test_overall_eligible_when_all_pass():
    criteria = [evaluate_rule(make_rule("annual_income"), make_profile(income_range="below_50000"))]
    assert overall_status(criteria) == ELIGIBLE


def test_overall_ineligible_when_any_fail():
    criteria = [
        evaluate_rule(make_rule("annual_income"), make_profile(income_range="below_50000")),
        evaluate_rule(make_rule("age", ">=", "60"), make_profile(age=30)),
    ]
    assert overall_status(criteria) == INELIGIBLE


def test_overall_uncertain_when_info_and_no_fail():
    criteria = [
        evaluate_rule(make_rule("annual_income"), make_profile(income_range="below_50000")),
        evaluate_rule(make_rule("annual_income"), make_profile()),  # missing -> INFO
    ]
    assert overall_status(criteria) == UNCERTAIN


# --- Categorical operators ---------------------------------------------------

def test_in_operator_categorical_values():
    rule = make_rule("house_type", "in", "houseless,kutcha")
    assert evaluate_rule(rule, make_profile(extra={"house_type": "kutcha"})).status == PASS
    assert evaluate_rule(rule, make_profile(extra={"house_type": "pucca"})).status == FAIL
