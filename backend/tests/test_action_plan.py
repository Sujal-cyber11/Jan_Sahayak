"""Tests for GET /action-plan/{profile_id}: ordering, common-document
dedupe, uncertain section, and exclusion of ineligible schemes."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def make_eligible_profile(client, extra=None):
    """Profile that is ELIGIBLE for PMAY-U and Atal Pension Yojana."""
    payload = {
        "state": "Uttar Pradesh",
        "age": 30,
        "education_level": "matric",
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
    response = client.post("/profile", json=payload)
    assert response.status_code == 201
    return response.json()["profile_id"]


def test_priority_schemes_ordered_and_ineligible_excluded(client):
    profile_id = make_eligible_profile(client)
    response = client.get(f"/action-plan/{profile_id}")
    assert response.status_code == 200
    body = response.json()

    slugs = [item["slug"] for item in body["priority_schemes"]]
    # Both eligible schemes present, IGNOAPS (age 30 -> FAIL) excluded.
    assert "atal-pension-yojana" in slugs
    assert "pmay-urban" in slugs
    # APY needs 2 mandatory docs, PMAY-U needs 3 -> APY first.
    assert slugs.index("atal-pension-yojana") < slugs.index("pmay-urban")
    # Missing-mandatory counts are non-decreasing along the list.
    counts = [item["missing_mandatory_count"] for item in body["priority_schemes"]]
    assert counts == sorted(counts)

    for item in body["priority_schemes"]:
        assert item["overall"] == "ELIGIBLE"
        assert item["needs_rechecking"] is True  # seed data is verified=false
        assert item["official_url"].startswith("https://")
        # Mandatory docs carry the flags; optional ones are separate.
        assert all(doc["mandatory"] for doc in item["mandatory_documents"])
        assert all(not doc["mandatory"] for doc in item["optional_documents"])

    every_other = slugs + [u["slug"] for u in body["uncertain_schemes"]]
    assert "ignoaps" not in every_other


def test_common_documents_deduplicated(client):
    profile_id = make_eligible_profile(client)
    body = client.get(f"/action-plan/{profile_id}").json()

    aadhaar = [c for c in body["common_documents"] if c["name_en"] == "Aadhaar card"]
    # Aadhaar appears once even though 2 eligible schemes need it.
    assert len(aadhaar) == 1
    assert {u["slug"] for u in aadhaar[0]["used_by"]} == {
        "atal-pension-yojana",
        "pmay-urban",
    }
    # Every listed common document is genuinely needed by 2+ schemes.
    assert all(len(c["used_by"]) >= 2 for c in body["common_documents"])
    # No duplicates by name.
    names = [c["name_en"] for c in body["common_documents"]]
    assert len(names) == len(set(names))


def test_uncertain_section_lists_missing_fields(client):
    # No income band -> PMAY-U has an INFO_REQUIRED income criterion.
    response = client.post(
        "/profile",
        json={
            "age": 30,
            "extra": {"lives_in_urban": True, "has_pucca_house": False},
        },
    )
    profile_id = response.json()["profile_id"]
    body = client.get(f"/action-plan/{profile_id}").json()

    assert "pmay-urban" not in [
        item["slug"] for item in body["priority_schemes"]
    ]
    pmay = next(
        u for u in body["uncertain_schemes"] if u["slug"] == "pmay-urban"
    )
    fields = [f["criterion"] for f in pmay["missing_fields"]]
    assert "annual_income" in fields
    # Documents shown "if it turns out eligible" with mandatory flags.
    assert len(pmay["documents_if_eligible"]) >= 1
    assert pmay["needs_rechecking"] is True
    assert pmay["official_url"].startswith("https://")


def test_action_plan_unknown_profile_404(client):
    response = client.get("/action-plan/999999")
    assert response.status_code == 404


def test_next_steps_mention_shared_documents(client):
    profile_id = make_eligible_profile(client)
    body = client.get(f"/action-plan/{profile_id}").json()
    # Aadhaar is shared by both eligible schemes -> the rule-based hint
    # tells the user to collect it first.
    apy = next(
        item
        for item in body["priority_schemes"]
        if item["slug"] == "atal-pension-yojana"
    )
    assert any("Aadhaar" in step for step in apy["next_steps_en"])
    assert any("आधार" in step for step in apy["next_steps_hi"])
    # Never claims to submit applications.
    assert any("cannot submit" in step for step in apy["next_steps_en"])
