"""REST endpoints: POST /profile, POST /match, GET /schemes/{id},
GET /schemes/{id}/details, GET /action-plan/{profile_id},
PUT /applications/{profile_id}/{scheme_id}, GET /applications/{profile_id}."""

import json
import re
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import schemas
from app.database import get_db
from app.engine import ELIGIBLE, INFO_REQUIRED, UNCERTAIN, evaluate_all
from app.models import ApplicationStatus, SavedProgress, Scheme, UserProfile

router = APIRouter()

# Self-reported statuses (HARD RULE: we never check government systems).
ALLOWED_STATUSES = {
    "NOT_APPLIED",
    "APPLIED",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
}

# Records are flagged as stale when the last check is older than this.
STALE_AFTER_DAYS = 90

# Deterministic proxy for "benefit info available": a quantified amount
# (Rs./rupee symbol) in the benefits text. Used only for ordering, never
# for eligibility.
BENEFIT_AMOUNT_RE = re.compile(r"Rs\.\s|₹")


def needs_rechecking(last_verified: str, verified: bool) -> bool:
    """True when the record is unverified OR last checked >90 days ago.

    This is a data-freshness flag for the UI, NOT an eligibility input.
    """
    if not verified:
        return True
    try:
        checked = datetime.strptime(last_verified, "%Y-%m-%d").date()
    except ValueError:
        return True  # unparseable date means unknown freshness -> recheck
    return (date.today() - checked).days > STALE_AFTER_DAYS


@router.post("/profile", response_model=schemas.ProfileOut, status_code=201)
def create_profile(
    payload: schemas.ProfileCreate, db: Session = Depends(get_db)
) -> schemas.ProfileOut:
    """Store a minimal profile; returns its id for later matching."""
    profile = UserProfile(
        state=payload.state,
        age=payload.age,
        education_level=payload.education_level,
        occupation=payload.occupation,
        income_range=payload.income_range,
        extra_json=json.dumps(payload.extra) if payload.extra else None,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return schemas.ProfileOut(
        profile_id=profile.id,
        state=profile.state,
        age=profile.age,
        education_level=profile.education_level,
        occupation=profile.occupation,
        income_range=profile.income_range,
        extra=payload.extra or {},
    )


@router.post("/match", response_model=schemas.MatchResponse)
def match(
    payload: schemas.MatchRequest, db: Session = Depends(get_db)
) -> schemas.MatchResponse:
    """Run the deterministic engine for every scheme against one profile."""
    if payload.profile_id is not None:
        profile = db.get(UserProfile, payload.profile_id)
        if profile is None:
            raise HTTPException(status_code=404, detail="profile not found")
    elif payload.profile is not None:
        # Inline profile: persist it (so progress can be saved later) and use it.
        created = create_profile(payload.profile, db)
        profile = db.get(UserProfile, created.profile_id)
    else:
        raise HTTPException(
            status_code=400, detail="provide profile_id or profile"
        )

    schemes = db.query(Scheme).order_by(Scheme.id).all()
    matches = evaluate_all(schemes, profile)
    return schemas.MatchResponse(
        profile_id=profile.id,
        results=[
            schemas.SchemeMatchOut(
                scheme_id=m.scheme_id,
                slug=m.slug,
                name_en=m.name_en,
                name_hi=m.name_hi,
                overall=m.overall,
                criteria=[
                    schemas.CriterionOut(
                        criterion=c.criterion,
                        label_en=c.label_en,
                        label_hi=c.label_hi,
                        status=c.status,
                        explanation_en=c.explanation_en,
                        explanation_hi=c.explanation_hi,
                    )
                    for c in m.criteria
                ],
            )
            for m in matches
        ],
    )


@router.get("/schemes/{scheme_id}", response_model=schemas.SchemeDetailOut)
def get_scheme(scheme_id: int, db: Session = Depends(get_db)) -> dict:
    """Full scheme record: rules, documents, sources, application steps."""
    scheme = db.get(Scheme, scheme_id)
    if scheme is None:
        raise HTTPException(status_code=404, detail="scheme not found")
    return {
        "id": scheme.id,
        "slug": scheme.slug,
        "name_en": scheme.name_en,
        "name_hi": scheme.name_hi,
        "description_en": scheme.description_en,
        "description_hi": scheme.description_hi,
        "benefits_en": scheme.benefits_en,
        "benefits_hi": scheme.benefits_hi,
        "category_en": scheme.category_en,
        "category_hi": scheme.category_hi,
        "state": scheme.state,
        "target_groups": [
            group for group in scheme.target_groups.split(",") if group
        ],
        "ministry": scheme.ministry,
        "official_url": scheme.official_url,
        "application_steps_en": json.loads(scheme.application_steps_en),
        "application_steps_hi": json.loads(scheme.application_steps_hi),
        "last_verified": scheme.last_verified,
        "verified": scheme.verified,
        "needs_rechecking": needs_rechecking(
            scheme.last_verified, scheme.verified
        ),
        "todo_note": scheme.todo_note,
        "age_limit_text": scheme.age_limit_text,
        "income_limit_text": scheme.income_limit_text,
        "application_deadline": scheme.application_deadline,
        "deadline_note": scheme.deadline_note,
        "rules": [schemas.RuleOut.model_validate(r) for r in scheme.rules],
        "documents": [
            schemas.DocumentOut.model_validate(d) for d in scheme.documents
        ],
        "sources": [
            schemas.SourceOut.model_validate(s) for s in scheme.sources
        ],
    }


# --- Action plan ------------------------------------------------------------
# Purely deterministic aggregation over engine results + document data.
# No LLM anywhere in the ordering or suggestions.


def _saved_status(db: Session, profile_id: int) -> dict[int, dict]:
    """document_status_json per scheme id for one profile."""
    rows = (
        db.query(SavedProgress)
        .filter(SavedProgress.profile_id == profile_id)
        .all()
    )
    return {
        row.scheme_id: json.loads(row.document_status_json or "{}")
        for row in rows
    }


def _is_available(status: dict, doc_id: int) -> bool:
    return status.get(str(doc_id)) == "available"


def _doc_payload(doc, status: dict) -> dict:
    return {
        "id": doc.id,
        "name_en": doc.name_en,
        "name_hi": doc.name_hi,
        "instructions_en": doc.instructions_en,
        "instructions_hi": doc.instructions_hi,
        "mandatory": doc.mandatory,
        "where_to_get": doc.where_to_get,
        "typical_effort": doc.typical_effort,
        "todo_note": doc.todo_note,
        "available": _is_available(status, doc.id),
    }


def _suggest_next_steps(scheme: Scheme, missing_docs: list, usage: dict) -> tuple[list[str], list[str]]:
    """Plain rule-based next-step suggestions (EN, HI). Never an LLM."""
    en: list[str] = []
    hi: list[str] = []

    # Rule 1: a missing document shared by 2+ eligible schemes -> collect it first.
    common_missing = [
        doc
        for doc in missing_docs
        if len(usage.get(doc.name_en.strip().lower(), [])) >= 2
    ]
    if common_missing:
        doc = common_missing[0]
        count = len(usage[doc.name_en.strip().lower()])
        en.append(f"Get your {doc.name_en} first — {count} of your eligible schemes need it.")
        hi.append(f"पहले अपना {doc.name_hi} प्राप्त करें — आपकी {count} पात्र योजनाओं को इसकी आवश्यकता है।")
    elif missing_docs:
        # Rule 2: otherwise start with the first missing document.
        doc = missing_docs[0]
        en.append(f"Start by collecting: {doc.name_en}.")
        hi.append(f"शुरुआत इन्हें इकट्ठा करने से करें: {doc.name_hi}।")

    # Rule 3: unverified data always carries this reminder.
    if needs_rechecking(scheme.last_verified, scheme.verified):
        en.append("Confirm the scheme details on the official portal before relying on them.")
        hi.append("योजना के विवरण पर भरोसा करने से पहले आधिकारिक पोर्टल पर पुष्टि करें।")

    # Rule 4: official portals only, never a claim to submit applications.
    en.append("Apply only through the official portal — we cannot submit applications for you.")
    hi.append("आवेदन केवल आधिकारिक पोर्टल पर करें — हम आपकी ओर से आवेदन जमा नहीं कर सकते।")
    return en, hi


@router.get("/action-plan/{profile_id}")
def action_plan(profile_id: int, db: Session = Depends(get_db)) -> dict:
    """Priority list of ELIGIBLE schemes + common documents + uncertain
    schemes. Ordering: fewest missing mandatory documents first, then
    benefit info available (quantified amount), then slug. Deterministic;
    the LLM is never involved."""
    profile = db.get(UserProfile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="profile not found")

    schemes = db.query(Scheme).order_by(Scheme.id).all()
    matches = {s.id: evaluate_all([s], profile)[0] for s in schemes}
    status_by_scheme = _saved_status(db, profile_id)

    eligible = [s for s in schemes if matches[s.id].overall == ELIGIBLE]
    uncertain = [s for s in schemes if matches[s.id].overall == UNCERTAIN]

    # Doc name (lowercased) -> eligible schemes that require it.
    usage: dict[str, list[Scheme]] = {}
    for scheme in eligible:
        for doc in scheme.documents:
            usage.setdefault(doc.name_en.strip().lower(), []).append(scheme)

    def missing_mandatory_count(scheme: Scheme) -> int:
        status = status_by_scheme.get(scheme.id, {})
        return sum(
            1
            for doc in scheme.documents
            if doc.mandatory and not _is_available(status, doc.id)
        )

    def benefit_rank(scheme: Scheme) -> int:
        return 0 if BENEFIT_AMOUNT_RE.search(scheme.benefits_en) else 1

    priority = []
    for scheme in sorted(
        eligible,
        key=lambda s: (missing_mandatory_count(s), benefit_rank(s), s.slug),
    ):
        status = status_by_scheme.get(scheme.id, {})
        docs = sorted(scheme.documents, key=lambda d: d.sort_order)
        missing_docs = [d for d in docs if not _is_available(status, d.id)]
        next_steps_en, next_steps_hi = _suggest_next_steps(
            scheme, missing_docs, usage
        )
        priority.append(
            {
                "scheme_id": scheme.id,
                "slug": scheme.slug,
                "name_en": scheme.name_en,
                "name_hi": scheme.name_hi,
                "benefits_en": scheme.benefits_en,
                "benefits_hi": scheme.benefits_hi,
                "missing_mandatory_count": missing_mandatory_count(scheme),
                "benefit_info_available": benefit_rank(scheme) == 0,
                "overall": ELIGIBLE,
                "verified": scheme.verified,
                "needs_rechecking": needs_rechecking(
                    scheme.last_verified, scheme.verified
                ),
                "official_url": scheme.official_url,
                "last_verified": scheme.last_verified,
                "application_steps_en": json.loads(scheme.application_steps_en),
                "application_steps_hi": json.loads(scheme.application_steps_hi),
                "mandatory_documents": [
                    _doc_payload(d, status) for d in docs if d.mandatory
                ],
                "optional_documents": [
                    _doc_payload(d, status) for d in docs if not d.mandatory
                ],
                "documents_ready": sum(
                    1 for d in docs if _is_available(status, d.id)
                ),
                "documents_total": len(docs),
                "next_steps_en": next_steps_en,
                "next_steps_hi": next_steps_hi,
            }
        )

    # Documents needed by 2+ eligible schemes, listed once.
    common_documents = []
    seen_keys: set[str] = set()
    for scheme in eligible:
        for doc in scheme.documents:
            key = doc.name_en.strip().lower()
            if key in seen_keys:
                continue
            used_by = usage[key]
            if len(used_by) >= 2:
                seen_keys.add(key)
                common_documents.append(
                    {
                        "name_en": doc.name_en,
                        "name_hi": doc.name_hi,
                        "where_to_get": doc.where_to_get,
                        "typical_effort": doc.typical_effort,
                        "used_by": [
                            {
                                "scheme_id": u.id,
                                "slug": u.slug,
                                "name_en": u.name_en,
                                "name_hi": u.name_hi,
                            }
                            for u in used_by
                        ],
                    }
                )

    uncertain_out = []
    for scheme in sorted(uncertain, key=lambda s: s.slug):
        status = status_by_scheme.get(scheme.id, {})
        missing_fields = [
            {
                "criterion": c.criterion,
                "label_en": c.label_en,
                "label_hi": c.label_hi,
                "explanation_en": c.explanation_en,
                "explanation_hi": c.explanation_hi,
            }
            for c in matches[scheme.id].criteria
            if c.status == INFO_REQUIRED
        ]
        docs = sorted(scheme.documents, key=lambda d: d.sort_order)
        uncertain_out.append(
            {
                "scheme_id": scheme.id,
                "slug": scheme.slug,
                "name_en": scheme.name_en,
                "name_hi": scheme.name_hi,
                "verified": scheme.verified,
                "needs_rechecking": needs_rechecking(
                    scheme.last_verified, scheme.verified
                ),
                "official_url": scheme.official_url,
                "last_verified": scheme.last_verified,
                "missing_fields": missing_fields,
                "documents_if_eligible": [
                    _doc_payload(d, status) for d in docs
                ],
            }
        )

    return {
        "profile_id": profile_id,
        "priority_schemes": priority,
        "common_documents": common_documents,
        "uncertain_schemes": uncertain_out,
    }


# --- Scheme details + application tracking ---------------------------------


@router.get("/schemes/{scheme_id}/details", response_model=schemas.SchemeDetailsOut)
def scheme_details(
    scheme_id: int,
    profile_id: int = Query(...),
    db: Session = Depends(get_db),
) -> dict:
    """One scheme + this user's per-criterion engine results + their
    self-reported application status."""
    scheme = db.get(Scheme, scheme_id)
    if scheme is None:
        raise HTTPException(status_code=404, detail="scheme not found")
    profile = db.get(UserProfile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="profile not found")

    match = evaluate_all([scheme], profile)[0]

    app_row = (
        db.query(ApplicationStatus)
        .filter(
            ApplicationStatus.profile_id == profile_id,
            ApplicationStatus.scheme_id == scheme_id,
        )
        .first()
    )

    docs = sorted(scheme.documents, key=lambda d: d.sort_order)
    return {
        "scheme_id": scheme.id,
        "slug": scheme.slug,
        "name_en": scheme.name_en,
        "name_hi": scheme.name_hi,
        "description_en": scheme.description_en,
        "description_hi": scheme.description_hi,
        "benefits_en": scheme.benefits_en,
        "benefits_hi": scheme.benefits_hi,
        "category_en": scheme.category_en,
        "category_hi": scheme.category_hi,
        "state": scheme.state,
        "ministry": scheme.ministry,
        "overall": match.overall,
        "criteria": match.criteria,
        "age_limit_text": scheme.age_limit_text,
        "income_limit_text": scheme.income_limit_text,
        "application_deadline": scheme.application_deadline,
        "deadline_note": scheme.deadline_note,
        "mandatory_documents": [
            schemas.DocumentOut.model_validate(d) for d in docs if d.mandatory
        ],
        "optional_documents": [
            schemas.DocumentOut.model_validate(d) for d in docs if not d.mandatory
        ],
        "application_steps_en": json.loads(scheme.application_steps_en),
        "application_steps_hi": json.loads(scheme.application_steps_hi),
        "official_url": scheme.official_url,
        "last_verified": scheme.last_verified,
        "verified": scheme.verified,
        "needs_rechecking": needs_rechecking(scheme.last_verified, scheme.verified),
        "todo_note": scheme.todo_note,
        "application_status": app_row.status if app_row else "NOT_APPLIED",
        "application_note": app_row.note if app_row else None,
        "application_updated_at": (
            app_row.updated_at.isoformat() if app_row else None
        ),
    }


@router.put(
    "/applications/{profile_id}/{scheme_id}",
    response_model=schemas.ApplicationStatusOut,
)
def set_application_status(
    profile_id: int,
    scheme_id: int,
    payload: schemas.ApplicationStatusUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Upsert the user's SELF-REPORTED status. We do not verify against
    government systems (documented limitation)."""
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=422, detail="invalid status")
    profile = db.get(UserProfile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="profile not found")
    scheme = db.get(Scheme, scheme_id)
    if scheme is None:
        raise HTTPException(status_code=404, detail="scheme not found")

    row = (
        db.query(ApplicationStatus)
        .filter(
            ApplicationStatus.profile_id == profile_id,
            ApplicationStatus.scheme_id == scheme_id,
        )
        .first()
    )
    if row is None:
        row = ApplicationStatus(profile_id=profile_id, scheme_id=scheme_id)
        db.add(row)
    row.status = payload.status
    if payload.note is not None:
        row.note = payload.note
    db.commit()
    db.refresh(row)
    return _application_row_out(row, scheme)


def _application_row_out(row: ApplicationStatus, scheme: Scheme) -> dict:
    return {
        "scheme_id": scheme.id,
        "slug": scheme.slug,
        "name_en": scheme.name_en,
        "name_hi": scheme.name_hi,
        "status": row.status,
        "note": row.note,
        "updated_at": row.updated_at.isoformat(),
    }


@router.get("/applications/{profile_id}", response_model=list[schemas.ApplicationStatusOut])
def list_applications(
    profile_id: int,
    status: str = Query(..., description="applied | not_applied | <exact status>"),
    db: Session = Depends(get_db),
) -> list[dict]:
    """List a profile's application rows.

    status=applied    -> anything except NOT_APPLIED
    status=not_applied-> NOT_APPLIED only (explicit rows)
    status=<STATUS>   -> exact match, e.g. APPROVED
    """
    profile = db.get(UserProfile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="profile not found")

    query = db.query(ApplicationStatus, Scheme).join(
        Scheme, ApplicationStatus.scheme_id == Scheme.id
    ).filter(ApplicationStatus.profile_id == profile_id)

    if status == "applied":
        query = query.filter(ApplicationStatus.status != "NOT_APPLIED")
    elif status == "not_applied":
        query = query.filter(ApplicationStatus.status == "NOT_APPLIED")
    elif status in ALLOWED_STATUSES:
        query = query.filter(ApplicationStatus.status == status)
    else:
        raise HTTPException(status_code=422, detail="invalid status filter")

    rows = query.order_by(ApplicationStatus.updated_at.desc()).all()
    return [_application_row_out(row, scheme) for row, scheme in rows]
