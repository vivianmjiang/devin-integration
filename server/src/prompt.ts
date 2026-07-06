interface BuildPromptInput {
  repositoryUrl: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string | null;
}

export function buildDevinPrompt(input: BuildPromptInput): string {
  return [
    `Repository:`,
    input.repositoryUrl,
    "",
    `Issue #${input.issueNumber}:`,
    input.issueTitle,
    "",
    input.issueBody?.trim() || "(No issue body provided.)",
    "",
    "Please:",
    "- create a branch",
    "- implement the fix",
    "- run relevant tests",
    "- open a PR",
    "- summarize changes and test results in the PR",
  ].join("\n");
}
