import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // KMB Proxy
  app.get("/api/bus/kmb/:stopId", async (req, res) => {
    try {
      const response = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${req.params.stopId}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch KMB data" });
    }
  });

  // MTRB Proxy
  app.post("/api/bus/mtrb", async (req, res) => {
    try {
      const response = await fetch("https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch MTRB data" });
    }
  });

  // CTB Proxy
  app.get("/api/bus/ctb/:stopId/:route", async (req, res) => {
    try {
      const response = await fetch(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/CTB/${req.params.stopId}/${req.params.route}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch CTB data" });
    }
  });

  // GMB Proxy
  app.get("/api/bus/gmb/eta/:routeId/:stopId", async (req, res) => {
    try {
      const response = await fetch(`https://data.etagmb.gov.hk/eta/route-stop/${req.params.routeId}/${req.params.stopId}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch GMB data" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
