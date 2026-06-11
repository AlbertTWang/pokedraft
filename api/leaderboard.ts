import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLeaderboard, handle } from "./_lib/handlers.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const limit = Number(req.query.limit) || undefined;
  const { status, json } = await handle(() => getLeaderboard({ limit }));
  // Short edge cache to spare Redis on bursts; still near-real-time.
  res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
  res.status(status).json(json);
}
