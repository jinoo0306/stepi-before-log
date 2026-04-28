import type { Request, Response, NextFunction } from "express";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.API_KEY;
  if (!expected) {
    res.status(500).json({ error: "server misconfigured: API_KEY missing" });
    return;
  }
  const provided = req.header("x-api-key");
  if (provided !== expected) {
    res.status(401).json({ error: "invalid or missing api key" });
    return;
  }
  next();
}
