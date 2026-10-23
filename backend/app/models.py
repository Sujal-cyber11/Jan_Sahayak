"""ORM models.

Maps to PROPOSAL.md section 9 ("Database Structure"):
  Schemes, Eligibility Rules, Required Documents, Source Records,
  User Profiles, Saved Progress.

Eligibility is evaluated ONLY by the Python rules engine against the
(criterion, operator, threshold) rows - never by an LLM.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Scheme(Base):
    """A government scheme record (section 9, item 1).

    verified=False means the record still needs human review against the
    official source. application_steps_* store a JSON array of step strings.
    """

    __tablename__ = "schemes"

    id = Column(Integer, primary_key=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    name_en = Column(String, nullable=False)
    name_hi = Column(String, nullable=False)
    description_en = Column(Text, nullable=False)
    description_hi = Column(Text, nullable=False)
    benefits_en = Column(Text, nullable=False)
    benefits_hi = Column(Text, nullable=False)
    category_en = Column(String, nullable=False)
    category_hi = Column(String, nullable=False)
    # Applicable state or region, e.g. "All India", "Rural areas - all states".
    state = Column(String, nullable=False, default="All India")
    # Comma-separated target groups: student, farmer, woman, worker, rural, EWS.
    # Used only for labels and frontend filtering, never for eligibility.
    target_groups = Column(Text, nullable=False, default="")
    ministry = Column(String, nullable=False)
    official_url = Column(String, nullable=False)
    # Application instructions as a JSON array of steps (section 8).
    application_steps_en = Column(Text, nullable=False)
    application_steps_hi = Column(Text, nullable=False)
    last_verified = Column(String, nullable=False)  # ISO date, e.g. "2026-10-23"
    verified = Column(Boolean, nullable=False, default=False)
    todo_note = Column(Text, nullable=True)  # open questions about rule data
    # Plain-language eligibility summaries (never parsed for decisions).
    age_limit_text = Column(Text, nullable=True)
    income_limit_text = Column(Text, nullable=True)
    # Verified cut-off date (ISO) or null = none known (never invented).
    application_deadline = Column(String, nullable=True)
    # Cadence note, e.g. "Applications open year-round" (null = unknown).
    deadline_note = Column(Text, nullable=True)

    rules = relationship(
        "EligibilityRule",
        back_populates="scheme",
        cascade="all, delete-orphan",
    )
    documents = relationship(
        "RequiredDocument",
        back_populates="scheme",
        cascade="all, delete-orphan",
    )
    sources = relationship(
        "SourceRecord",
        back_populates="scheme",
        cascade="all, delete-orphan",
    )


class EligibilityRule(Base):
    """One deterministic check: profile field vs operator vs threshold
    (section 9, item 2).
    """

    __tablename__ = "eligibility_rules"

    id = Column(Integer, primary_key=True)
    scheme_id = Column(
        Integer, ForeignKey("schemes.id"), nullable=False, index=True
    )
    criterion = Column(String, nullable=False)  # profile field key, e.g. "age"
    label_en = Column(String, nullable=False)
    label_hi = Column(String, nullable=False)
    operator = Column(String, nullable=False)  # "==", ">=", "<=", "in", ...
    threshold = Column(String, nullable=False)  # compared value ("in" = CSV list)
    # Plain-language explanations returned with each PASS / FAIL / INFO_REQUIRED.
    pass_explanation_en = Column(Text, nullable=False)
    pass_explanation_hi = Column(Text, nullable=False)
    fail_explanation_en = Column(Text, nullable=False)
    fail_explanation_hi = Column(Text, nullable=False)

    scheme = relationship("Scheme", back_populates="rules")


class RequiredDocument(Base):
    """A document needed to apply for a scheme (section 9, item 3)."""

    __tablename__ = "required_documents"

    id = Column(Integer, primary_key=True)
    scheme_id = Column(
        Integer, ForeignKey("schemes.id"), nullable=False, index=True
    )
    name_en = Column(String, nullable=False)
    name_hi = Column(String, nullable=False)
    # Plain-language guidance, e.g. "Self-attested copy; original for verification".
    instructions_en = Column(Text, nullable=False)
    instructions_hi = Column(Text, nullable=False)
    # Mandatory docs must be collected; optional ones are supporting evidence.
    mandatory = Column(Boolean, nullable=False, default=True)
    # Issuing office or official portal for obtaining the document (null = unknown).
    where_to_get = Column(Text, nullable=True)
    # Rough acquisition effort, e.g. "same day" (null = unknown; never guessed).
    typical_effort = Column(String, nullable=True)
    # Open question about this document's requirement (null if none).
    todo_note = Column(Text, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)

    scheme = relationship("Scheme", back_populates="documents")


class SourceRecord(Base):
    """Official source for scheme data (section 9, item 4).

    version is a snapshot marker (e.g. "1.0") of the record we captured,
    NOT an official document version.
    """

    __tablename__ = "source_records"

    id = Column(Integer, primary_key=True)
    scheme_id = Column(
        Integer, ForeignKey("schemes.id"), nullable=False, index=True
    )
    label = Column(String, nullable=False)  # e.g. "Official portal", "myScheme"
    url = Column(String, nullable=False)
    last_verified = Column(String, nullable=False)  # ISO date
    version = Column(String, nullable=False, default="1.0")

    scheme = relationship("Scheme", back_populates="sources")


class UserProfile(Base):
    """Minimum necessary profile information (section 9, item 5).

    Fixed columns hold the core wizard answers; extra_json stores any
    additional criterion-specific answers as a JSON object (e.g. caste,
    land ownership) so the schema stays small and privacy-friendly.
    """

    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True)
    state = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    education_level = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    income_range = Column(String, nullable=True)
    extra_json = Column(Text, nullable=True)  # JSON object of other answers
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    saved_progress = relationship(
        "SavedProgress", back_populates="profile", cascade="all, delete-orphan"
    )


class SavedProgress(Base):
    """Saved checklist state per user per scheme (section 9, item 6).

    document_status_json maps document id -> "available" | "missing" |
    "needs_verification". completion_percent is checklist progress ONLY,
    never an approval probability (HARD RULE 4).
    """

    __tablename__ = "saved_progress"

    id = Column(Integer, primary_key=True)
    profile_id = Column(
        Integer, ForeignKey("user_profiles.id"), nullable=False, index=True
    )
    scheme_id = Column(
        Integer, ForeignKey("schemes.id"), nullable=False, index=True
    )
    document_status_json = Column(Text, nullable=False, default="{}")
    completion_percent = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    profile = relationship("UserProfile", back_populates="saved_progress")
    scheme = relationship("Scheme")


class ApplicationStatus(Base):
    """Self-reported application state per profile per scheme.

    The user tells us; we never query government systems. Allowed values
    (checked in the API layer): NOT_APPLIED, APPLIED, UNDER_REVIEW,
    APPROVED, REJECTED. One row per (profile, scheme) pair, upserted.
    """

    __tablename__ = "application_statuses"

    id = Column(Integer, primary_key=True)
    profile_id = Column(
        Integer, ForeignKey("user_profiles.id"), nullable=False, index=True
    )
    scheme_id = Column(
        Integer, ForeignKey("schemes.id"), nullable=False, index=True
    )
    status = Column(String, nullable=False, default="NOT_APPLIED")
    # Optional user note, e.g. "Applied at CSC on 12 Oct".
    note = Column(Text, nullable=True)
    updated_at = Column(
        DateTime, nullable=False, default=utc_now, onupdate=utc_now
    )
