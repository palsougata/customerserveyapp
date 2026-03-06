import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("survey.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS surveys (
    id TEXT PRIMARY KEY,
    contact TEXT NOT NULL,
    type TEXT NOT NULL,
    rating INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  )
`);

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.post("/api/surveys", (req, res) => {
    const { contact, type } = req.body;
    if (!contact || !type) {
      return res.status(400).json({ error: "Contact and type are required" });
    }

    const id = uuidv4();
    const stmt = db.prepare("INSERT INTO surveys (id, contact, type) VALUES (?, ?, ?)");
    stmt.run(id, contact, type);

    // In a real app, this is where you'd call Twilio/Klaviyo
    const surveyLink = `${process.env.APP_URL}/survey/${id}`;
    console.log(`[MOCK SEND] Sending ${type} to ${contact}: ${surveyLink}`);

    res.json({ id, link: surveyLink });
  });

  app.get("/api/surveys/:id", (req, res) => {
    const stmt = db.prepare("SELECT * FROM surveys WHERE id = ?");
    const survey = stmt.get(req.params.id);
    
    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }
    res.json(survey);
  });

  app.post("/api/surveys/:id/submit", (req, res) => {
    const { rating } = req.body;
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Invalid rating" });
    }

    const stmt = db.prepare("UPDATE surveys SET rating = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?");
    const result = stmt.run(rating, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Survey not found" });
    }

    res.json({ success: true });
  });

  // Stats for the agent (optional but useful)
  app.get("/api/stats", (req, res) => {
    const stmt = db.prepare("SELECT COUNT(*) as total, AVG(rating) as avgRating FROM surveys WHERE rating IS NOT NULL");
    res.json(stmt.get());
  });

  // Admin Routes
  app.get("/api/admin/surveys", (req, res) => {
    const stmt = db.prepare("SELECT * FROM surveys ORDER BY created_at DESC");
    const surveys = stmt.all();
    res.json(surveys);
  });

  app.delete("/api/admin/surveys/:id", (req, res) => {
    const stmt = db.prepare("DELETE FROM surveys WHERE id = ?");
    stmt.run(req.params.id);
    res.json({ success: true });
  });

  // GitHub OAuth & Sync Routes
  app.get("/api/auth/github/url", (req, res) => {
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID!,
      redirect_uri: `${process.env.APP_URL}/auth/github/callback`,
      scope: "repo,user",
      state: uuidv4(),
    });
    res.json({ url: `https://github.com/login/oauth/authorize?${params}` });
  });

  app.get("/auth/github/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const tokenData = await tokenRes.json();
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS', token: '${tokenData.access_token}' }, '*');
                window.close();
              } else {
                window.location.href = '/admin';
              }
            </script>
            <p>Authentication successful. You can close this window.</p>
          </body>
        </html>
      `);
    } catch (err) {
      res.status(500).send("Authentication failed");
    }
  });

  app.post("/api/admin/github/sync", async (req, res) => {
    const { token, repoName } = req.body;
    if (!token || !repoName) return res.status(400).json({ error: "Missing data" });

    try {
      // 1. Get user info
      const userRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `token ${token}` }
      });
      const user = await userRes.json();

      // 2. Create repo (ignore if exists)
      await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: { 
          Authorization: `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: repoName, private: true })
      });

      // 3. Simple sync: Push main files
      // In a real scenario, we'd use a git library, but for this POC 
      // we'll use the GitHub API to create/update files individually
      const filesToSync = [
        "package.json", "server.ts", "src/App.tsx", "src/main.tsx", 
        "src/index.css", "metadata.json", "vite.config.ts", "tsconfig.json",
        "src/components/AgentPage.tsx", "src/components/SurveyPage.tsx",
        "src/components/GiftPage.tsx", "src/components/AdminPage.tsx"
      ];

      for (const file of filesToSync) {
        try {
          const content = await fs.readFile(path.join(__dirname, file), "utf8");
          const pathUrl = `https://api.github.com/repos/${user.login}/${repoName}/contents/${file}`;
          
          // Check if file exists to get SHA
          const checkRes = await fetch(pathUrl, {
            headers: { Authorization: `token ${token}` }
          });
          let sha;
          if (checkRes.ok) {
            const fileData = await checkRes.json();
            sha = fileData.sha;
          }

          await fetch(pathUrl, {
            method: "PUT",
            headers: { 
              Authorization: `token ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              message: `Sync ${file} from SurveyPulse POC`,
              content: Buffer.from(content).toString("base64"),
              sha
            })
          });
        } catch (e) {
          console.error(`Failed to sync ${file}`, e);
        }
      }

      res.json({ success: true, url: `https://github.com/${user.login}/${repoName}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Sync failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
