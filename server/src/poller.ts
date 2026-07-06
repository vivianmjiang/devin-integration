import { config } from "./config.js";
import { listActiveSessions, updateSession } from "./db.js";
import { getDevinSession } from "./devin.js";
import { commentOnIssue } from "./github.js";
import type { SessionRecord } from "./types.js";

let isPolling = false;

export function startPoller(): NodeJS.Timeout {
  const timer = setInterval(() => {
    void pollActiveSessions();
  }, config.pollIntervalMs);

  void pollActiveSessions();
  return timer;
}

export async function pollActiveSessions(): Promise<void> {
  if (isPolling) {
    return;
  }

  isPolling = true;
  try {
    const sessions = listActiveSessions();
    await Promise.all(sessions.map((session) => pollSession(session)));
  } finally {
    isPolling = false;
  }
}

async function pollSession(session: SessionRecord): Promise<void> {
  try {
    const devinSession = await getDevinSession(session.session_id);
    const transitionedToTerminal =
      session.status !== devinSession.status &&
      (devinSession.status === "completed" || devinSession.status === "failed");

    updateSession(session.id, {
      status: devinSession.status,
      prUrl: devinSession.prUrl,
      error: devinSession.error,
      completedAt: transitionedToTerminal ? new Date().toISOString() : null,
    });

    if (transitionedToTerminal && (devinSession.status === "completed" || devinSession.status === "failed")) {
      await commentOnTerminalStatus(session, devinSession.status, devinSession.prUrl, devinSession.error);
    }
  } catch (error) {
    console.error(`Failed to poll Devin session ${session.session_id}`, error);
  }
}

async function commentOnTerminalStatus(
  session: SessionRecord,
  status: "completed" | "failed",
  prUrl: string | null,
  error: string | null,
): Promise<void> {
  const [owner, repo] = session.repo.split("/");
  if (!owner || !repo) {
    console.warn(`Cannot comment on issue for malformed repo: ${session.repo}`);
    return;
  }

  const body =
    status === "completed"
      ? `Completed.\n\nPR:\n${prUrl ?? "No PR URL was found in the Devin session output."}`
      : `Devin couldn't complete automatically.\n\nSee logs.${error ? `\n\nError:\n${error}` : ""}`;

  await commentOnIssue(
    {
      owner,
      repo,
      issueNumber: session.issue_number,
    },
    body,
  );
}
