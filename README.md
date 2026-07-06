# Devin GitHub Integration

Automation service that starts a Devin session whenever a GitHub issue receives the `devin-fix` label, tracks session state in SQLite, comments progress back on the issue, and exposes a dashboard at `localhost:3000/dashboard`.

## Architecture

- GitHub sends `issues` webhooks to `POST /webhook/github`.
- The Express service verifies `x-hub-signature-256`, filters for `action=labeled` and `DEVIN_LABEL`, then creates a Devin session.
- Session metadata is stored in SQLite.
- An in-process poller checks Devin every minute and updates status, PR URL, and GitHub comments.
- The React dashboard reads `GET /api/sessions` and `GET /metrics`.

## Setup

Copy the example environment file and fill in real credentials:

```sh
cp .env.example .env
```

Required values:

- `DEVIN_API_KEY`: Devin API key for `POST /v1/sessions` and `GET /v1/session/{id}`.
- `GITHUB_TOKEN`: GitHub token with permission to comment on issues in the target repository.
- `GITHUB_WEBHOOK_SECRET`: Shared secret configured on the GitHub webhook.
- `DEVIN_LABEL`: Label that triggers Devin, default `devin-fix`.

Install dependencies:

```sh
cd server && npm install
cd ../web && npm install
```

## Run locally

Start the backend:

```sh
cd server
npm run dev
```

Start the dashboard:

```sh
cd web
npm run dev
```

Open `http://localhost:3000/dashboard`.

## GitHub webhook

Expose the backend with a local tunnel such as ngrok:

```sh
ngrok http 4000
```

In the GitHub repository settings, add a webhook:

- Payload URL: `https://your-tunnel-url/webhook/github`
- Content type: `application/json`
- Secret: same value as `GITHUB_WEBHOOK_SECRET`
- Events: Issues

Add the configured label, such as `devin-fix`, to an issue. The service will create a Devin session and comment:

```text
Started Devin session.

Session ID:
abc123
```

When Devin finishes, the service comments with the PR URL if one is found. If Devin fails, the service comments with the failure message.

## Endpoints

- `GET /health`: service health check.
- `POST /webhook/github`: GitHub issues webhook.
- `GET /api/sessions`: tracked sessions for the dashboard.
- `GET /metrics`: aggregate counts and average completion time.

Example metrics response:

```json
{
  "active": 2,
  "completed": 8,
  "failed": 1,
  "avgCompletionMinutes": 7.4
}
```