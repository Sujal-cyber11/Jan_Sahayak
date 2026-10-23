// Thin fetch wrapper around the FastAPI backend. Uses only the existing
// endpoints: POST /match, GET /schemes/{id} and GET /health.
//
// All failures are mapped to a small set of friendly error codes so the UI
// can show a translated message instead of a raw error.

import type {
  ActionPlanResponse,
  ApplicationRow,
  ApplicationStatus,
  HealthResponse,
  MatchResponse,
  ProfilePayload,
  SchemeDetail,
  SchemeDetails,
} from "../types";

const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type ApiErrorCode = "network" | "notFound" | "invalid" | "server";

export class ApiError extends Error {
  code: ApiErrorCode;

  constructor(code: ApiErrorCode) {
    super(code);
    this.code = code;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new ApiError("network");
  }
  if (response.status === 404) throw new ApiError("notFound");
  if (response.status === 422) throw new ApiError("invalid");
  if (!response.ok) throw new ApiError("server");
  return response.json() as Promise<T>;
}

export function getHealth(): Promise<HealthResponse> {
  return request("/health");
}

export function postMatch(body: {
  profile?: ProfilePayload;
  profile_id?: number;
}): Promise<MatchResponse> {
  return request("/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getScheme(id: number): Promise<SchemeDetail> {
  return request(`/schemes/${id}`);
}

export function getActionPlan(profileId: number): Promise<ActionPlanResponse> {
  return request(`/action-plan/${profileId}`);
}

export function getSchemeDetails(
  schemeId: number,
  profileId: number,
): Promise<SchemeDetails> {
  return request(`/schemes/${schemeId}/details?profile_id=${profileId}`);
}

export function putApplicationStatus(
  profileId: number,
  schemeId: number,
  status: ApplicationStatus,
  note?: string,
): Promise<ApplicationRow> {
  return request(`/applications/${profileId}/${schemeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, note }),
  });
}

export function listApplications(
  profileId: number,
  filter: "applied" | "not_applied",
): Promise<ApplicationRow[]> {
  return request(`/applications/${profileId}?status=${filter}`);
}
