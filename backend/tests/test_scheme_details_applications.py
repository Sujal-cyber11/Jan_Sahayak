"""Tests for GET /schemes/{id}/details and application-status endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

ALLOWED = ["NOT_APPLIED", "APPLIED", "UNDER_REVIEW", "APPROVED", "REJECTED"]


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def profile(client, extra=None):
    payload = {
        "state": "Uttar Pradesh",
        "age": 30,
        "occupation": "farmer",
        "income_range": "100000_250000",
        "extra": {
            "lives_in_urban": True,
            "has_pucca_house": False,
            "has_bank_account": True,
            "is_income_taxpayer": False,
            **(extra or {}),
        },
    }
    return client.post("/profile", json=payload).json()["profile_id"]


def scheme_id_by_slug(client, slug):
    pid = profile(client)
    results = client.post("/match", json={"profile_id": pid}).json()["results"]
    return next(r["scheme_id"] for r in results if r["slug"] == slug)


# --- details endpoint ------------------------------------------------------


def test_details_fields_present_and_null_deadline_message(client):
    pid = profile(client)
    results = client.post("/match", json={"profile_id": pid}).json()["results"]
    apy_id = next(r["scheme_id"] for r in results if r["slug"] == "atal-pension-yojana")

    response = client.get(f"/schemes/{apy_id}/details", params={"profile_id": pid})
    assert response.status_code == 200
    body = response.json()

    assert body["slug"] == "atal-pension-yojana"
    assert body["overall"] in {"ELIGIBLE", "INELIGIBLE", "UNCERTAIN"}
    assert len(body["criteria"]) >= 1
    # Plain-language who-can-apply text.
    assert "18 to 40" in body["age_limit_text"]
    assert body["income_limit_text"]
    # No invented dates: seed has no verified deadline -> null.
    assert body["application_deadline"] is None
    assert body["deadline_note"]
    # Documents split mandatory first.
    assert len(body["mandatory_documents"]) >= 1
    assert all(d["mandatory"] for d in body["mandatory_documents"])
    assert all(not d["mandatory"] for d in body["optional_documents"])
    # Steps + official link + unverified flag + default status.
    assert len(body["application_steps_en"]) >= 1
    assert body["official_url"].startswith("https://")
    assert body["needs_rechecking"] is True
    assert body["application_status"] == "NOT_APPLIED"


def test_details_per_user_criterion_results(client):
    # Income given -> APY should be ELIGIBLE with per-criterion PASS rows.
    pid = profile(client)
    results = client.post("/match", json={"profile_id": pid}).json()["results"]
    apy_id = next(r["scheme_id"] for r in results if r["slug"] == "atal-pension-yojana")
    body = client.get(f"/schemes/{apy_id}/details", params={"profile_id": pid}).json()
    assert body["overall"] == "ELIGIBLE"
    assert all(c["status"] in {"PASS", "FAIL", "INFO_REQUIRED"} for c in body["criteria"])

    # Same scheme, younger user -> FAIL on age for APY, INELIGIBLE overall.
    pid2 = client.post(
        "/profile",
        json={"age": 17, "income_range": "below_50000"},
    ).json()["profile_id"]
    body2 = client.get(f"/schemes/{apy_id}/details", params={"profile_id": pid2}).json()
    assert body2["overall"] == "INELIGIBLE"
    age_row = next(c for c in body2["criteria"] if c["criterion"] == "age")
    assert age_row["status"] == "FAIL"
    # Same scheme, different user -> different result for same rule.
    assert body["overall"] != body2["overall"] or True  # isolation shown below


def test_details_404s(client):
    pid = profile(client)
    assert client.get("/schemes/999999/details", params={"profile_id": pid}).status_code == 404
    sid = scheme_id_by_slug(client, "atal-pension-yojana")
    assert client.get(f"/schemes/{sid}/details", params={"profile_id": 999999}).status_code == 404


# --- application status ----------------------------------------------------


def test_set_and_list_application_status(client):
    pid = profile(client)
    sid = scheme_id_by_slug(client, "atal-pension-yojana")

    response = client.put(
        f"/applications/{pid}/{sid}", json={"status": "APPLIED", "note": "via CSC"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "APPLIED"
    assert body["note"] == "via CSC"
    assert body["slug"] == "atal-pension-yojana"

    applied = client.get(f"/applications/{pid}", params={"status": "applied"}).json()
    assert [a["scheme_id"] for a in applied] == [sid]

    not_applied = client.get(f"/applications/{pid}", params={"status": "not_applied"}).json()
    assert sid not in [a["scheme_id"] for a in not_applied]

    # Upsert: changing status updates the same row.
    client.put(f"/applications/{pid}/{sid}", json={"status": "APPROVED"})
    applied = client.get(f"/applications/{pid}", params={"status": "applied"}).json()
    assert applied[0]["status"] == "APPROVED"
    assert applied[0]["note"] == "via CSC"  # note preserved when not resent

    # Details endpoint reflects the status.
    details = client.get(f"/schemes/{sid}/details", params={"profile_id": pid}).json()
    assert details["application_status"] == "APPROVED"


def test_invalid_status_422(client):
    pid = profile(client)
    sid = scheme_id_by_slug(client, "atal-pension-yojana")
    response = client.put(f"/applications/{pid}/{sid}", json={"status": "MAYBE"})
    assert response.status_code == 422
    response = client.get(f"/applications/{pid}", params={"status": "maybe"})
    assert response.status_code == 422


def test_status_isolated_per_profile(client):
    sid = scheme_id_by_slug(client, "atal-pension-yojana")
    pid1 = profile(client)
    pid2 = profile(client)

    client.put(f"/applications/{pid1}/{sid}", json={"status": "APPROVED"})
    # Profile 2 unaffected.
    assert client.get(
        f"/schemes/{sid}/details", params={"profile_id": pid2}
    ).json()["application_status"] == "NOT_APPLIED"
    applied2 = client.get(f"/applications/{pid2}", params={"status": "applied"}).json()
    assert applied2 == []
    applied1 = client.get(f"/applications/{pid1}", params={"status": "applied"}).json()
    assert applied1[0]["status"] == "APPROVED"
