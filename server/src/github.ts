import { Octokit } from "@octokit/rest";
import crypto from "node:crypto";
import { config } from "./config.js";

export interface IssueReference {
  owner: string;
  repo: string;
  issueNumber: number;
}

const octokit = new Octokit({ auth: config.githubToken });

export function verifyGithubSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", config.githubWebhookSecret)
    .update(rawBody)
    .digest("hex")}`;

  const signature = Buffer.from(signatureHeader);
  const expectedSignature = Buffer.from(expected);

  return signature.length === expectedSignature.length && crypto.timingSafeEqual(signature, expectedSignature);
}

export async function commentOnIssue(issue: IssueReference, body: string): Promise<void> {
  await octokit.issues.createComment({
    owner: issue.owner,
    repo: issue.repo,
    issue_number: issue.issueNumber,
    body,
  });
}
