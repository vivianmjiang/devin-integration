import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import type { Metrics, NewSessionRecord, SessionRecord, SessionStatus, SessionUpdate } from "./types.js";

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_number INTEGER NOT NULL,
    issue_title TEXT NOT NULL,
    repo TEXT NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    pr_url TEXT,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
  CREATE INDEX IF NOT EXISTS idx_sessions_issue ON sessions(repo, issue_number);
`);

const insertSessionStatement = db.prepare(`
  INSERT INTO sessions (issue_number, issue_title, repo, session_id, status, started_at)
  VALUES (@issueNumber, @issueTitle, @repo, @sessionId, @status, @startedAt)
`);

const updateSessionStatement = db.prepare(`
  UPDATE sessions
  SET
    status = COALESCE(@status, status),
    pr_url = COALESCE(@prUrl, pr_url),
    error = COALESCE(@error, error),
    completed_at = COALESCE(@completedAt, completed_at)
  WHERE id = @id
`);

export function createSessionRecord(input: NewSessionRecord): SessionRecord {
  const result = insertSessionStatement.run({
    ...input,
    startedAt: input.startedAt ?? new Date().toISOString(),
  });

  return getSessionById(Number(result.lastInsertRowid));
}

export function getSessionById(id: number): SessionRecord {
  const record = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRecord | undefined;
  if (!record) {
    throw new Error(`Session record not found: ${id}`);
  }

  return record;
}

export function listSessions(): SessionRecord[] {
  return db
    .prepare("SELECT * FROM sessions ORDER BY datetime(created_at) DESC")
    .all() as SessionRecord[];
}

export function listActiveSessions(): SessionRecord[] {
  return db
    .prepare("SELECT * FROM sessions WHERE status IN ('pending', 'running') ORDER BY datetime(created_at) ASC")
    .all() as SessionRecord[];
}

export function updateSession(id: number, update: SessionUpdate): SessionRecord {
  updateSessionStatement.run({
    id,
    status: update.status ?? null,
    prUrl: update.prUrl ?? null,
    error: update.error ?? null,
    completedAt: update.completedAt ?? null,
  });

  return getSessionById(id);
}

export function getMetrics(): Metrics {
  const counts = db
    .prepare(
      `
      SELECT
        SUM(CASE WHEN status IN ('pending', 'running') THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM sessions
    `,
    )
    .get() as { active: number | null; completed: number | null; failed: number | null };

  const average = db
    .prepare(
      `
      SELECT AVG((julianday(completed_at) - julianday(started_at)) * 24 * 60) AS avgCompletionMinutes
      FROM sessions
      WHERE status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL
    `,
    )
    .get() as { avgCompletionMinutes: number | null };

  return {
    active: counts.active ?? 0,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    avgCompletionMinutes: Number((average.avgCompletionMinutes ?? 0).toFixed(1)),
  };
}

export function isTerminalStatus(status: SessionStatus): boolean {
  return status === "completed" || status === "failed";
}
