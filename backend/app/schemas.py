"""Pydantic request/response models for the API endpoints."""

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.engine import INCOME_BANDS


class ProfileCreate(BaseModel):
    """Minimal profile payload. Income is a band key, never an exact number."""

    state: Optional[str] = None
    age: Optional[int] = None
    education_level: Optional[str] = None
    occupation: Optional[str] = None
    income_range: Optional[str] = None
    # Any criterion-specific answers not covered by the columns above,
    # keyed by the engine's criterion name (e.g. "is_farmer_family": true).
    extra: Optional[dict[str, Any]] = None

    @field_validator("age")
    @classmethod
    def age_in_range(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and not 0 <= value <= 120:
            raise ValueError("age must be between 0 and 120")
        return value

    @field_validator("income_range")
    @classmethod
    def band_must_be_known(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in INCOME_BANDS:
            raise ValueError(f"unknown income band '{value}'")
        return value


class ProfileOut(BaseModel):
    profile_id: int
    state: Optional[str]
    age: Optional[int]
    education_level: Optional[str]
    occupation: Optional[str]
    income_range: Optional[str]
    extra: dict[str, Any]


class CriterionOut(BaseModel):
    criterion: str
    label_en: str
    label_hi: str
    status: str  # PASS / FAIL / INFO_REQUIRED
    explanation_en: str
    explanation_hi: str


class SchemeMatchOut(BaseModel):
    scheme_id: int
    slug: str
    name_en: str
    name_hi: str
    overall: str  # ELIGIBLE / INELIGIBLE / UNCERTAIN
    criteria: list[CriterionOut]


class MatchRequest(BaseModel):
    """Match using an existing profile_id, or an inline profile payload."""

    profile_id: Optional[int] = None
    profile: Optional[ProfileCreate] = None


class MatchResponse(BaseModel):
    profile_id: int
    results: list[SchemeMatchOut]


class RuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    criterion: str
    label_en: str
    label_hi: str
    operator: str
    threshold: str


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name_en: str
    name_hi: str
    instructions_en: str
    instructions_hi: str
    mandatory: bool
    where_to_get: Optional[str]
    typical_effort: Optional[str]
    todo_note: Optional[str]


class SourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    url: str
    last_verified: str
    version: str


class SchemeDetailOut(BaseModel):
    """Full scheme record for GET /schemes/{id}."""

    id: int
    slug: str
    name_en: str
    name_hi: str
    description_en: str
    description_hi: str
    benefits_en: str
    benefits_hi: str
    category_en: str
    category_hi: str
    state: str
    # Labels/filtering only - never used for eligibility decisions.
    target_groups: list[str]
    ministry: str
    official_url: str
    application_steps_en: list[str]
    application_steps_hi: list[str]
    last_verified: str
    verified: bool
    # Data-freshness flag (unverified OR last checked >90 days ago).
    needs_rechecking: bool
    todo_note: Optional[str]
    rules: list[RuleOut]
    documents: list[DocumentOut]
    sources: list[SourceOut]
    # Plain-language summaries (null = not filled in; never guessed).
    age_limit_text: Optional[str]
    income_limit_text: Optional[str]
    # Verified cut-off date (ISO string) or null = none known.
    application_deadline: Optional[str]
    deadline_note: Optional[str]


class CriterionResultOut(BaseModel):
    """One rule evaluated against THIS user's profile."""

    criterion: str
    label_en: str
    label_hi: str
    status: str  # PASS / FAIL / INFO_REQUIRED
    explanation_en: str
    explanation_hi: str


class ApplicationStatusOut(BaseModel):
    scheme_id: int
    slug: str
    name_en: str
    name_hi: str
    status: str  # NOT_APPLIED / APPLIED / UNDER_REVIEW / APPROVED / REJECTED
    note: Optional[str]
    updated_at: str  # ISO timestamp


class ApplicationStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None


class SchemeDetailsOut(BaseModel):
    """GET /schemes/{id}/details?profile_id=... — everything the details
    page needs, including per-user criterion results and self-reported
    application status."""

    scheme_id: int
    slug: str
    name_en: str
    name_hi: str
    description_en: str
    description_hi: str
    benefits_en: str
    benefits_hi: str
    category_en: str
    category_hi: str
    state: str
    ministry: str
    overall: str  # ELIGIBLE / INELIGIBLE / UNCERTAIN (engine only)
    criteria: list[CriterionResultOut]
    age_limit_text: Optional[str]
    income_limit_text: Optional[str]
    application_deadline: Optional[str]
    deadline_note: Optional[str]
    mandatory_documents: list[DocumentOut]
    optional_documents: list[DocumentOut]
    application_steps_en: list[str]
    application_steps_hi: list[str]
    official_url: str
    last_verified: str
    verified: bool
    needs_rechecking: bool
    todo_note: Optional[str]
    application_status: str  # current self-reported status for this profile
    application_note: Optional[str]
    application_updated_at: Optional[str]
