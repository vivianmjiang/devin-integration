import { Router, type Request } from "express";
import { config } from "../config.js";
import { createSessionRecord } from "../db.js";
import { createDevinSession } from "../devin.js";
import { commentOnIssue, verifyGithubSignature } from "../github.js";
import { buildDevinPrompt } from "../prompt.js";

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

interface GithubIssueLabelPayload {
  action?: string;
  label?: {
    name?: string;
  };
  issue?: {
    number: number;
    title: string;
    body: string | null;
    html_url: string;
  };
  repository?: {
    full_name: string;
    html_url: string;
    owner: {
      login: string;
    };
    name: string;
  };
}

export const webhookRouter = Router();

webhookRouter.post("/github", async (req: RequestWithRawBody, res, next) => {
  try {
    const rawBody = req.rawBody;
    if (!rawBody || !verifyGithubSignature(rawBody, req.header("x-hub-signature-256"))) {
      res.status(401).json({ error: "Invalid GitHub webhook signature" });
      return;
    }

    const payload = req.body as GithubIssueLabelPayload;
    if (payload.action !== "labeled" || payload.label?.name !== config.devinLabel) {
      res.sendStatus(204);
      return;
    }

    if (!payload.issue || !payload.repository) {
      res.status(400).json({ error: "Webhook payload missing issue or repository" });
      return;
    }

    const prompt = buildDevinPrompt({
      repositoryUrl: payload.repository.html_url,
      issueNumber: payload.issue.number,
      issueTitle: payload.issue.title,
      issueBody: payload.issue.body,
    });

    const sessionId = await createDevinSession(prompt);
    createSessionRecord({
      issueNumber: payload.issue.number,
      issueTitle: payload.issue.title,
      repo: payload.repository.full_name,
      sessionId,
      status: "running",
    });

    await commentOnIssue(
      {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issueNumber: payload.issue.number,
      },
      `Started Devin session.\n\nSession ID:\n${sessionId}`,
    );

    res.status(202).json({ sessionId });
  } catch (error) {
    next(error);
  }
});
