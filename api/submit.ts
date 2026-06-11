import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handle, submitRun } from "./_lib/handlers";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const body = typeof req.body === "string" ? safeParse(req.body) : req.body ?? {};
  const { status, json } = await handle(() => submitRun(body));
  res.status(status).json(json);
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
