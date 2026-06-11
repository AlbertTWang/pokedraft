import { defineConfig, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage } from "node:http";

// Runs the same /api handlers locally under `npm run dev`, backed by the
// in-memory store. In production Vercel serves api/*.ts as real functions.
function devApi(): Plugin {
  return {
    name: "pokedraft-dev-api",
    configureServer(server) {
      const middleware: Connect.NextHandleFunction = async (req, res, next) => {
        const url = req.url || "";
        if (!url.startsWith("/api/")) return next();
        const path = url.split("?")[0];
        try {
          const mod = await server.ssrLoadModule("/api/_lib/handlers.ts");
          const { handle, submitRun, getLeaderboard } = mod;

          // Own every /api/* path so Vite never serves the raw .ts source.
          let result: { status: number; json: unknown };
          if (path === "/api/submit") {
            if (req.method === "POST") {
              const body = await readBody(req);
              result = await handle(() => submitRun(body));
            } else {
              result = { status: 405, json: { error: "Method not allowed" } };
            }
          } else if (path === "/api/leaderboard") {
            if (req.method === "GET") {
              const limit =
                Number(new URL(url, "http://localhost").searchParams.get("limit")) || undefined;
              result = await handle(() => getLeaderboard({ limit }));
            } else {
              result = { status: 405, json: { error: "Method not allowed" } };
            }
          } else {
            result = { status: 404, json: { error: "Not found" } };
          }

          res.statusCode = result.status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(result.json));
        } catch (e) {
          server.config.logger.error(`[dev-api] ${String(e)}`);
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "dev api error" }));
        }
      };

      // The app only calls POST /api/submit and GET /api/leaderboard, both of
      // which this handles. (A bare GET /api/submit may be served as source by
      // Vite's file middleware in dev — irrelevant; on Vercel it's a real 405.)
      server.middlewares.use(middleware);
    },
  };
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devApi()],
});
