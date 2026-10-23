"""Stage 1 smoke tests: health endpoint, seed integrity, DB structure.

Also verifies the section 9 tables (documents, sources, profiles,
saved progress) exist and work end-to-end.
"""

import json

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    # Context manager form triggers the FastAPI lifespan (init_db + seed).
    with TestClient(app) as c:
        yield c


def test_health_reports_ok_and_scheme_count(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    # The seeder loads exactly 10 schemes from seed/schemes.json.
    assert body["schemes"] == 10


def test_every_seeded_scheme_is_unverified_and_has_rules():
    # Every record starts verified=false (HARD RULE 6) and has >=1 rule.
    from app.database import SessionLocal
    from app.models import Scheme

    with SessionLocal() as db:
        schemes = db.query(Scheme).all()
        assert len(schemes) == 10
        for scheme in schemes:
            assert scheme.verified is False
            assert len(scheme.rules) >= 1
            assert scheme.official_url.startswith("https://")


def test_section8_fields_are_present_for_every_scheme():
    # Section 8: state/region, benefits, application instructions,
    # documents and source records with last verification date.
    from app.database import SessionLocal
    from app.models import Scheme

    with SessionLocal() as db:
        schemes = db.query(Scheme).all()
        for scheme in schemes:
            assert scheme.state
            assert scheme.benefits_en and scheme.benefits_hi
            steps = json.loads(scheme.application_steps_en)
            assert len(steps) >= 3
            assert len(scheme.documents) >= 1
            for doc in scheme.documents:
                assert doc.name_en and doc.instructions_en
            assert len(scheme.sources) >= 1
            for source in scheme.sources:
                assert source.url.startswith("https://")
                assert source.last_verified and source.version


def test_user_profile_and_saved_progress_roundtrip():
    # Section 9, items 5-6: minimal profile + saved checklist progress.
    from app.database import SessionLocal
    from app.models import SavedProgress, Scheme, UserProfile

    with SessionLocal() as db:
        scheme = db.query(Scheme).first()
        profile = UserProfile(
            state="Uttar Pradesh",
            age=45,
            education_level="graduate",
            occupation="farmer",
            income_range="under_100000",
            extra_json=json.dumps({"is_farmer_family": True}),
        )
        db.add(profile)
        db.flush()  # assign profile.id

        progress = SavedProgress(
            profile_id=profile.id,
            scheme_id=scheme.id,
            document_status_json=json.dumps(
                {str(scheme.documents[0].id): "available"}
            ),
            completion_percent=33,
        )
        db.add(progress)
        db.commit()

        reloaded = (
            db.query(SavedProgress)
            .filter(SavedProgress.profile_id == profile.id)
            .one()
        )
        assert reloaded.scheme_id == scheme.id
        # Completion % is checklist progress, never approval chance.
        assert reloaded.completion_percent == 33
        assert "available" in reloaded.document_status_json
