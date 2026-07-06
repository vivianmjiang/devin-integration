import { Router } from "express";
import { getMetrics, listSessions } from "../db.js";

export const apiRouter = Router();

apiRouter.get("/sessions", (_req, res) => {
  res.json({ sessions: listSessions() });
});

apiRouter.get("/metrics", (_req, res) => {
  res.json(getMetrics());
});
