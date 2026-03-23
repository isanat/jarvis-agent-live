import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPSTREAM_API = process.env.UPSTREAM_API_URL || "https://travelconcierge.site";

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "2mb" }));

  // Generic JSON proxy helper
  const proxyJson = (path: string) => async (req: express.Request, res: express.Response) => {
    try {
      const upstream = await fetch(`${UPSTREAM_API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await upstream.json().catch(() => ({ success: false, error: "Upstream error" }));
      res.status(upstream.ok ? 200 : upstream.status).json(data);
    } catch (err) {
      console.error(`[${path} proxy]`, err);
      res.status(502).json({ success: false, error: "Upstream unavailable" });
    }
  };

  // Proxy travel API routes → upstream
  app.post("/api/flight/status", proxyJson("/api/flight/status"));
  app.post("/api/weather",       proxyJson("/api/weather"));
  app.post("/api/nearby",        proxyJson("/api/nearby"));

  // Proxy POST /chat-stream → upstream API, preserving SSE streaming
  app.post("/chat-stream", async (req, res) => {
    try {
      const upstream = await fetch(`${UPSTREAM_API}/api/chat-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });

      if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => "Upstream error");
        return res.status(upstream.status).send(text);
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const reader = upstream.body.getReader();
      const flush = () => { if (typeof (res as any).flush === "function") (res as any).flush(); };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
        flush();
      }
      res.end();
    } catch (err) {
      console.error("[/chat-stream proxy]", err);
      if (!res.headersSent) {
        res.status(502).json({ error: "Upstream unavailable" });
      }
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
