// Shared API types, mirroring the FastAPI response models (backend/app/schemas.py).

export interface Answers {
  state?: string;
  age?: number;
  education_level?: string;
  occupation?: string;
  income_range?: string;
  // Criterion-specific answers keyed by the engine's criterion name.
  extra: Record<string, string | number | boolean>;
}

export interface ProfilePayload {
  state?: string;
  age?: number;
  education_level?: string;
  occupation?: string;
  income_range?: string;
  extra: Record<string, string | number | boolean>;
}

export type CriterionStatus = "PASS" | "FAIL" | "INFO_REQUIRED";
export type OverallStatus = "ELIGIBLE" | "INELIGIBLE" | "UNCERTAIN";

export interface CriterionOut {
  criterion: string;
  label_en: string;
  label_hi: string;
  status: CriterionStatus;
  explanation_en: string;
  explanation_hi: string;
}

export interface SchemeMatch {
  scheme_id: number;
  slug: string;
  name_en: string;
  name_hi: string;
  overall: OverallStatus;
  criteria: CriterionOut[];
}

export interface MatchResponse {
  profile_id: number;
  results: SchemeMatch[];
}

export interface SchemeRule {
  id: number;
  criterion: string;
  label_en: string;
  label_hi: string;
  operator: string;
  threshold: string;
}

export interface SchemeDocument {
  id: number;
  name_en: string;
  name_hi: string;
  instructions_en: string;
  instructions_hi: string;
  mandatory: boolean;
  where_to_get: string | null;
  typical_effort: string | null;
  todo_note: string | null;
}

export interface SchemeSource {
  id: number;
  label: string;
  url: string;
  last_verified: string;
  version: string;
}

export interface SchemeDetail {
  id: number;
  slug: string;
  name_en: string;
  name_hi: string;
  description_en: string;
  description_hi: string;
  benefits_en: string;
  benefits_hi: string;
  category_en: string;
  category_hi: string;
  state: string;
  target_groups: string[];
  ministry: string;
  official_url: string;
  application_steps_en: string[];
  application_steps_hi: string[];
  last_verified: string;
  verified: boolean;
  needs_rechecking: boolean;
  todo_note: string | null;
  rules: SchemeRule[];
  documents: SchemeDocument[];
  sources: SchemeSource[];
  age_limit_text: string | null;
  income_limit_text: string | null;
  application_deadline: string | null;
  deadline_note: string | null;
}

export interface HealthResponse {
  status: string;
  schemes: number;
  groq_configured: boolean;
}

// One scheme card = engine match result + full record from GET /schemes/{id}.
export interface CardData {
  match: SchemeMatch;
  detail: SchemeDetail;
}

// --- Action plan (GET /action-plan/{profile_id}) ---------------------------

export interface PlanDocument {
  id: number;
  name_en: string;
  name_hi: string;
  instructions_en: string;
  instructions_hi: string;
  mandatory: boolean;
  where_to_get: string | null;
  typical_effort: string | null;
  todo_note: string | null;
  available: boolean;
}

export interface PriorityScheme {
  scheme_id: number;
  slug: string;
  name_en: string;
  name_hi: string;
  benefits_en: string;
  benefits_hi: string;
  missing_mandatory_count: number;
  benefit_info_available: boolean;
  overall: "ELIGIBLE";
  verified: boolean;
  needs_rechecking: boolean;
  official_url: string;
  last_verified: string;
  application_steps_en: string[];
  application_steps_hi: string[];
  mandatory_documents: PlanDocument[];
  optional_documents: PlanDocument[];
  documents_ready: number;
  documents_total: number;
  next_steps_en: string[];
  next_steps_hi: string[];
}

export interface CommonDocument {
  name_en: string;
  name_hi: string;
  where_to_get: string | null;
  typical_effort: string | null;
  used_by: { scheme_id: number; slug: string; name_en: string; name_hi: string }[];
}

export interface MissingField {
  criterion: string;
  label_en: string;
  label_hi: string;
  explanation_en: string;
  explanation_hi: string;
}

export interface UncertainScheme {
  scheme_id: number;
  slug: string;
  name_en: string;
  name_hi: string;
  verified: boolean;
  needs_rechecking: boolean;
  official_url: string;
  last_verified: string;
  missing_fields: MissingField[];
  documents_if_eligible: PlanDocument[];
}

export interface ActionPlanResponse {
  profile_id: number;
  priority_schemes: PriorityScheme[];
  common_documents: CommonDocument[];
  uncertain_schemes: UncertainScheme[];
}

// --- Scheme details + application tracking ---------------------------------

export type ApplicationStatus =
  | "NOT_APPLIED"
  | "APPLIED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

export interface SchemeDetails {
  scheme_id: number;
  slug: string;
  name_en: string;
  name_hi: string;
  description_en: string;
  description_hi: string;
  benefits_en: string;
  benefits_hi: string;
  category_en: string;
  category_hi: string;
  state: string;
  ministry: string;
  overall: "ELIGIBLE" | "INELIGIBLE" | "UNCERTAIN";
  criteria: {
    criterion: string;
    label_en: string;
    label_hi: string;
    status: "PASS" | "FAIL" | "INFO_REQUIRED";
    explanation_en: string;
    explanation_hi: string;
  }[];
  age_limit_text: string | null;
  income_limit_text: string | null;
  application_deadline: string | null;
  deadline_note: string | null;
  mandatory_documents: SchemeDocument[];
  optional_documents: SchemeDocument[];
  application_steps_en: string[];
  application_steps_hi: string[];
  official_url: string;
  last_verified: string;
  verified: boolean;
  needs_rechecking: boolean;
  todo_note: string | null;
  application_status: ApplicationStatus;
  application_note: string | null;
  application_updated_at: string | null;
}

export interface ApplicationRow {
  scheme_id: number;
  slug: string;
  name_en: string;
  name_hi: string;
  status: ApplicationStatus;
  note: string | null;
  updated_at: string;
}
