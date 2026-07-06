import { config } from "./config.js";
import type { SessionStatus } from "./types.js";

interface DevinCreateResponse {
  session_id?: string;
  id?: string;
  devin_id?: string;
}

export interface DevinSession {
  id: string;
  status: SessionStatus;
  rawStatus: string;
  prUrl: string | null;
  error: string | null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${config.devinBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.devinApiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Devin API ${response.status}: ${body}`);
  }

  return (await response.json()) as T;
}

export async function createDevinSession(prompt: string): Promise<string> {
  const response = await request<DevinCreateResponse>("/v1/sessions", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });

  const sessionId = response.session_id ?? response.id ?? response.devin_id;
  if (!sessionId) {
    throw new Error(`Devin create session response did not include a session id: ${JSON.stringify(response)}`);
  }

  return sessionId;
}

export async function getDevinSession(sessionId: string): Promise<DevinSession> {
  const response = await request<Record<string, unknown>>(`/v1/session/${encodeURIComponent(sessionId)}`);
  const rawStatus = getString(response, ["status_enum", "status", "state"]) ?? "unknown";

  return {
    id: sessionId,
    status: mapStatus(rawStatus),
    rawStatus,
    prUrl: extractPrUrl(response),
    error: getString(response, ["error", "error_message", "failure_reason"]),
  };
}

function mapStatus(status: string): SessionStatus {
  const normalized = status.toLowerCase();

  if (["completed", "complete", "done", "success", "succeeded"].includes(normalized)) {
    return "completed";
  }

  if (["failed", "error", "errored", "cancelled", "canceled"].includes(normalized)) {
    return "failed";
  }

  if (["pending", "queued", "created"].includes(normalized)) {
    return "pending";
  }

  return "running";
}

function getString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

function extractPrUrl(source: Record<string, unknown>): string | null {
  const direct = getString(source, ["pr_url", "pull_request_url", "pullRequestUrl"]);
  if (direct) {
    return direct;
  }

  const textFields = ["result", "summary", "output", "messages", "transcript"];
  for (const field of textFields) {
    const value = source[field];
    const serialized = typeof value === "string" ? value : JSON.stringify(value ?? "");
    const match = serialized.match(/https:\/\/github\.com\/[^\s)"']+\/pull\/\d+/);
    if (match) {
      return match[0];
    }
  }

  return null;
}
