import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config();

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getNumberEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return parsed;
}

export const config = {
  port: getNumberEnv("PORT", 4000),
  devinApiKey: getEnv("DEVIN_API_KEY"),
  devinBaseUrl: getEnv("DEVIN_BASE_URL", "https://api.devin.ai"),
  githubToken: getEnv("GITHUB_TOKEN"),
  githubWebhookSecret: getEnv("GITHUB_WEBHOOK_SECRET"),
  devinLabel: getEnv("DEVIN_LABEL", "devin-fix"),
  pollIntervalMs: getNumberEnv("POLL_INTERVAL_MS", 60_000),
  databasePath: getEnv("DATABASE_PATH", path.resolve(process.cwd(), "data/devin.sqlite")),
};
