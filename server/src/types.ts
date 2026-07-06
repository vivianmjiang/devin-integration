export type SessionStatus = "pending" | "running" | "completed" | "failed";

export interface SessionRecord {
  id: number;
  issue_number: number;
  issue_title: string;
  repo: string;
  session_id: string;
  status: SessionStatus;
  pr_url: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface NewSessionRecord {
  issueNumber: number;
  issueTitle: string;
  repo: string;
  sessionId: string;
  status: SessionStatus;
  startedAt?: string | null;
}

export interface SessionUpdate {
  status?: SessionStatus;
  prUrl?: string | null;
  error?: string | null;
  completedAt?: string | null;
}

export interface Metrics {
  active: number;
  completed: number;
  failed: number;
  avgCompletionMinutes: number;
}
