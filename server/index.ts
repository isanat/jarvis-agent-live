import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPSTREAM_API = process.env.UPSTREAM_API_URL || "https://travelconcierge.site";

// ── API Cache ─────────────────────────────────────────────────────────────────
// Evita chamadas repetidas ao Google Places / TomTom e exceder quotas diárias.

interface CacheEntry { data: unknown; expiresAt: number }
const cache = new Map<string, CacheEntry>();

// Limpa entradas expiradas periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache) if (v.expiresAt < now) cache.delete(k);
}, 60_000);

function cacheGet(key: string): unknown | null {
  const e = cache.get(key);
  if (!e || e.expiresAt < Date.now()) { cache.delete(key); return null; }
  return e.data;
}

function cacheSet(key: string, data: unknown, ttlMs: number) {
  // Limita tamanho: máx 500 entradas (FIFO)
  if (cache.size >= 500) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// Deduplicação: se a mesma chave já está em voo, aguarda o resultado
const inflight = new Map<string, Promise<unknown>>();

async function cachedProxy(
  upstreamPath: string,
  body: unknown,
  cacheKey: string,
  ttlMs: number,
): Promise<unknown> {
  // 1. Cache hit
  const hit = cacheGet(cacheKey);
  if (hit) return hit;

  // 2. Request já em voo para a mesma chave → aguarda
  if (inflight.has(cacheKey)) return inflight.get(cacheKey)!;

  // 3. Faz a chamada upstream
  const promise = (async () => {
    try {
      const upstream = await fetch(`${UPSTREAM_API}${upstreamPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await upstream.json().catch(() => ({ success: false, error: "Upstream error" }));
      if (upstream.ok) cacheSet(cacheKey, data, ttlMs);
      return data;
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, promise);
  return promise;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "2mb" }));

  // Generic JSON proxy helper (sem cache — para flight/status que muda com frequência)
  const proxyJson = (upPath: string) => async (req: express.Request, res: express.Response) => {
    try {
      const upstream = await fetch(`${UPSTREAM_API}${upPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await upstream.json().catch(() => ({ success: false, error: "Upstream error" }));
      // Never forward 5xx from upstream as-is — use 502 so the client gets a proper JSON body
      const status = upstream.ok ? 200 : (upstream.status >= 500 ? 502 : upstream.status);
      res.status(status).json(data);
    } catch (err) {
      console.error(`[${upPath} proxy]`, err);
      res.status(502).json({ success: false, error: "Upstream unavailable" });
    }
  };

  // Flight status → sem cache (dados em tempo real, 15s TTL aceitável)
  app.post("/api/flight/status", proxyJson("/api/flight/status"));

  // Weather → cache 30 min por cidade
  app.post("/api/weather", async (req, res) => {
    try {
      const city = (req.body.city || req.body.location || "unknown").toLowerCase().trim();
      const key = `weather:${city}`;
      const data = await cachedProxy("/api/weather", req.body, key, 30 * 60_000);
      res.json(data);
    } catch (err) {
      console.error("[weather proxy]", err);
      res.status(502).json({ success: false, error: "Upstream unavailable" });
    }
  });

  // Nearby → cache 10 min por (lat,lon arredondados 3 casas + type)
  // Lat/lon são arredondados para ~111m — evita cache miss por GPS drift
  app.post("/api/nearby", async (req, res) => {
    try {
      const lat  = req.body.lat  ?? req.body.latitude  ?? 0;
      const lon  = req.body.lon  ?? req.body.longitude ?? 0;
      const type = (req.body.type || "restaurant").toLowerCase();
      const rLat = Math.round(parseFloat(lat) * 1000) / 1000;
      const rLon = Math.round(parseFloat(lon) * 1000) / 1000;
      const key  = `nearby:${rLat},${rLon}:${type}`;

      console.log(`[nearby] ${cache.has(key) ? "HIT" : "MISS"} ${key}`);
      const data = await cachedProxy("/api/nearby", req.body, key, 10 * 60_000);
      res.json(data);
    } catch (err) {
      console.error("[nearby proxy]", err);
      res.status(502).json({ success: false, error: "Upstream unavailable" });
    }
  });

  // Docs process → forward multipart to upstream (no cache, use stream proxy)
  app.post("/api/docs/process", async (req, res) => {
    try {
      // Forward the raw request body as-is (multipart)
      const contentType = req.headers["content-type"] || "";
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      await new Promise<void>((resolve) => req.on("end", resolve));
      const body = Buffer.concat(chunks);

      const upstream = await fetch(`${UPSTREAM_API}/api/docs/process`, {
        method: "POST",
        headers: { "content-type": contentType, "content-length": String(body.length) },
        body,
      });
      const data = await upstream.json().catch(() => ({ success: false, error: "Upstream error" }));
      const status = upstream.ok ? 200 : (upstream.status >= 500 ? 502 : upstream.status);
      res.status(status).json(data);
    } catch (err) {
      console.error("[docs/process proxy]", err);
      res.status(502).json({ success: false, error: "Serviço de documentos indisponível. Tente novamente em instantes." });
    }
  });

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
