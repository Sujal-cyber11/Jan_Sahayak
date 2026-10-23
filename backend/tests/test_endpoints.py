"""API tests for POST /profile, POST /match and GET /schemes/{id}."""

import pytest
from fastapi.testclient import TestClient

from app.engine import ELIGIBLE, INFO_REQUIRED, INELIGIBLE, UNCERTAIN
from app.main import app


@pytest.fixture(scope="module")
def client():
    # Context manager form triggers the FastAPI lifespan (init_db + seed).
    with TestClient(app) as c:
        yield c


def base_profile(**overrides):
    profile = {
        "state": "Uttar Pradesh",
        "age": 30,
        "education_level": "matric",
        "occupation": "farmer",
        "income_range": "100000_250000",
        "extra": {"lives_in_urban": True, "has_pucca_house": False},
    }
    profile.update(overrides)
    return profile


def find_result(response, slug):
    return next(r for r in response.json()["results"] if r["slug"] == slug)


# --- POST /profile ----------------------------------------------------------

def test_create_profile(client):
    response = client.post("/profile", json=base_profile())
    assert response.status_code == 201
    body = response.json()
    assert body["profile_id"] >= 1
    assert body["extra"]["lives_in_urban"] is True


def test_create_profile_rejects_unknown_income_band(client):
    response = client.post("/profile", json=base_profile(income_range="0_999999"))
    assert response.status_code == 422


# --- POST /match ------------------------------------------------------------

def test_match_returns_results_for_all_schemes(client):
    response = client.post("/match", json={"profile": base_profile()})
    assert response.status_code == 200
    body = response.json()
    assert len(body["results"]) == 10
    for result in body["results"]:
        assert result["overall"] in {ELIGIBLE, INELIGIBLE, UNCERTAIN}
        assert len(result["criteria"]) >= 1


def test_match_eligible_when_band_fully_below_threshold(client):
    # PMAY-U income rule is <= 600000; band 100000-250000 is fully below.
    response = client.post("/match", json={"profile": base_profile()})
    result = find_result(response, "pmay-urban")
    assert result["overall"] == ELIGIBLE
    income = next(c for c in result["criteria"] if c["criterion"] == "annual_income")
    assert income["status"] == "PASS"


def test_match_ineligible_when_band_fully_above_threshold(client):
    response = client.post(
        "/match", json={"profile": base_profile(income_range="above_1200000")}
    )
    result = find_result(response, "pmay-urban")
    assert result["overall"] == INELIGIBLE
    income = next(c for c in result["criteria"] if c["criterion"] == "annual_income")
    assert income["status"] == "FAIL"


def test_match_uncertain_when_band_straddles_threshold(client):
    # Band 600000-1200000 contains the 600000 limit -> INFO, never a guess.
    response = client.post(
        "/match", json={"profile": base_profile(income_range="600000_1200000")}
    )
    result = find_result(response, "pmay-urban")
    assert result["overall"] == UNCERTAIN
    income = next(c for c in result["criteria"] if c["criterion"] == "annual_income")
    assert income["status"] == INFO_REQUIRED


def test_match_missing_field_names_exactly_which_field(client):
    response = client.post(
        "/match",
        json={
            "profile": base_profile(
                income_range=None,
                extra={"lives_in_urban": True, "has_pucca_house": False},
            )
        },
    )
    result = find_result(response, "pmay-urban")
    income = next(c for c in result["criteria"] if c["criterion"] == "annual_income")
    assert income["status"] == INFO_REQUIRED
    assert "annual_income" in income["explanation_en"]


def test_match_accepts_existing_profile_id(client):
    created = client.post("/profile", json=base_profile()).json()
    response = client.post("/match", json={"profile_id": created["profile_id"]})
    assert response.status_code == 200
    assert response.json()["profile_id"] == created["profile_id"]


def test_match_unknown_profile_id_returns_404(client):
    response = client.post("/match", json={"profile_id": 999999})
    assert response.status_code == 404


def test_match_requires_profile_or_profile_id(client):
    response = client.post("/match", json={})
    assert response.status_code == 400


# --- GET /schemes/{id} ------------------------------------------------------

def test_get_scheme_detail(client):
    response = client.get("/schemes/1")
    assert response.status_code == 200
    body = response.json()
    assert body["slug"]
    assert body["verified"] is False
    assert isinstance(body["application_steps_en"], list)
    assert len(body["rules"]) >= 1
    assert len(body["documents"]) >= 1
    assert len(body["sources"]) >= 1


def test_scheme_detail_has_target_groups_and_recheck_flag(client):
    # Section 8/feature fields added in the polish pass: target groups are
    # labels only, and needs_rechecking flags unverified or stale data.
    from app.routers import needs_rechecking
    from datetime import date, timedelta

    response = client.get("/schemes/1")
    body = response.json()
    assert isinstance(body["target_groups"], list)
    assert len(body["target_groups"]) >= 1
    # All seed records are verified=false -> always flagged for rechecking.
    assert body["needs_rechecking"] is True

    today = date.today()
    assert needs_rechecking("bad-date", True) is True  # unparseable
    assert needs_rechecking(today.isoformat(), True) is False  # fresh + verified
    assert (
        needs_rechecking((today - timedelta(days=91)).isoformat(), True) is True
    )  # stale
    assert needs_rechecking(today.isoformat(), False) is True  # unverified


def test_health_reports_groq_configuration(client):
    response = client.get("/health")
    body = response.json()
    assert "groq_configured" in body
    assert isinstance(body["groq_configured"], bool)


def test_get_scheme_unknown_id_returns_404(client):
    response = client.get("/schemes/9999")
    assert response.status_code == 404
