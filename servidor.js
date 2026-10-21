const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TWELVE_DATA_API_KEY;

app.disable("x-powered-by");
app.use(express.static(__dirname, { index: false }));

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, apiConfigured: Boolean(API_KEY), time: new Date().toISOString() });
});

app.get("/api/time_series", async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: "Configura TWELVE_DATA_API_KEY en Render." });

  const symbol = String(req.query.symbol || "EUR/USD");
  const interval = String(req.query.interval || "1min");
  const allowed = ["1min", "5min", "15min", "30min", "1h", "4h", "1day"];
  const outputsize = Math.min(5000, Math.max(10, Number(req.query.outputsize) || 250));

  if (symbol !== "EUR/USD" || !allowed.includes(interval)) {
    return res.status(400).json({ error: "Par o intervalo no permitido." });
  }

  try {
    const url = new URL("https://api.twelvedata.com/time_series");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("outputsize", String(outputsize));
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("apikey", API_KEY);

    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!response.ok || data.status === "error" || !Array.isArray(data.values)) {
      return res.status(502).json({ error: data.message || "Twelve Data no devolvió velas válidas." });
    }
    res.set("Cache-Control", "no-store");
    res.json(data);
  } catch (_error) {
    res.status(502).json({ error: "No se pudo consultar Twelve Data." });
  }
});

const wss = new WebSocket.Server({ noServer: true });
server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname !== "/live") return socket.destroy();
  wss.handleUpgrade(request, socket, head, client => wss.emit("connection", client, request));
});

wss.on("connection", client => {
  if (!API_KEY) return client.close(1011, "API key no configurada");

  const upstream = new WebSocket(
    "wss://ws.twelvedata.com/v1/quotes/price?apikey=" + encodeURIComponent(API_KEY)
  );
  let requestedSubscription = false;

  const subscribe = () => {
    if (requestedSubscription && upstream.readyState === WebSocket.OPEN) {
      upstream.send(JSON.stringify({ action: "subscribe", params: { symbols: "EUR/USD" } }));
    }
  };

  upstream.on("open", () => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "connection", status: "connected" }));
    }
    subscribe();
  });

  client.on("message", raw => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.action === "subscribe" && msg.params?.symbols === "EUR/USD") {
        requestedSubscription = true;
        subscribe();
      }
    } catch (_) {}
  });

  upstream.on("message", raw => {
    if (client.readyState === WebSocket.OPEN) client.send(raw.toString());
  });

  upstream.on("error", () => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "error", message: "Error en el flujo de Twelve Data." }));
    }
  });

  upstream.on("close", () => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "connection", status: "closed" }));
    }
  });

  client.on("close", () => {
    if (upstream.readyState === WebSocket.OPEN) upstream.close();
  });
  client.on("error", () => {
    try { upstream.close(); } catch (_) {}
  });
});

server.listen(PORT, "0.0.0.0", () => console.log(`EUR/USD Analyzer escuchando en ${PORT}`));
