import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { getMetrics } from "./db.js";
import { startPoller } from "./poller.js";
import { apiRouter } from "./routes/api.js";
import { webhookRouter } from "./routes/webhook.js";

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

const app = express();

app.use(
  express.json({
    verify: (req: RequestWithRawBody, _res, buf) => {
      req.rawBody = Buffer.from(buf);
    },
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/webhook", webhookRouter);
app.use("/api", apiRouter);
app.get("/metrics", (_req, res) => {
  res.json(getMetrics());
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({
    error: error instanceof Error ? error.message : "Unknown server error",
  });
});

app.listen(config.port, () => {
  console.log(`Automation service listening on http://localhost:${config.port}`);
  startPoller();
});
