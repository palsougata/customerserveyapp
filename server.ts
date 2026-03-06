import express from "express";
import { createServer as createViteServer } from "vite";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database setup with in-memory fallback for Vercel
let db: any;
let isInMemory = false;
let mockStore: any[] = []; // Fallback if SQLite completely fails

async function initDb() {
  try {
    const { default: Database } = await import("better-sqlite3");
    const dbPath = process.env.VERCEL ? ":memory:" : "survey.db";
    db = new Database(dbPath);
    if (dbPath === ":memory:") isInMemory = true;
    console.log(`Using ${isInMemory ? "in-memory" : "file-based"} database`);
    
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
  } catch (e) {
    console.error("SQLite failed to initialize, using mock store", e);
    db = null; // Mark as failed
  }
}

initDb();

const app = express();
app.use(express.json());

// Helper for survey links
const getAppUrl = (req: express.Request) => {
  return process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
};

// API Routes
app.post("/api/surveys", (req, res) => {
  const { contact, type } = req.body;
  if (!contact || !type) {
    return res.status(400).json({ error: "Contact and type are required" });
  }

  const id = uuidv4();
  const newSurvey = { id, contact, type, rating: null, created_at: new Date().toISOString(), completed_at: null };

  if (db) {
    try {
      const stmt = db.prepare("INSERT INTO surveys (id, contact, type) VALUES (?, ?, ?)");
      stmt.run(id, contact, type);
    } catch (err) {
      console.error("DB Insert failed", err);
      mockStore.push(newSurvey);
    }
  } else {
    mockStore.push(newSurvey);
  }

  const surveyLink = `${getAppUrl(req)}/survey/${id}`;
  console.log(`[MOCK SEND] Sending ${type} to ${contact}: ${surveyLink}`);

  res.json({ id, link: surveyLink });
});

app.get("/api/surveys/:id", (req, res) => {
  let survey;
  if (db) {
    try {
      const stmt = db.prepare("SELECT * FROM surveys WHERE id = ?");
      survey = stmt.get(req.params.id);
    } catch (err) {
      survey = mockStore.find(s => s.id === req.params.id);
    }
  } else {
    survey = mockStore.find(s => s.id === req.params.id);
  }
  
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

  let success = false;
  if (db) {
    try {
      const stmt = db.prepare("UPDATE surveys SET rating = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?");
      const result = stmt.run(rating, req.params.id);
      success = result.changes > 0;
    } catch (err) {
      const s = mockStore.find(s => s.id === req.params.id);
      if (s) {
        s.rating = rating;
        s.completed_at = new Date().toISOString();
        success = true;
      }
    }
  } else {
    const s = mockStore.find(s => s.id === req.params.id);
    if (s) {
      s.rating = rating;
      s.completed_at = new Date().toISOString();
      success = true;
    }
  }

  if (!success) {
    return res.status(404).json({ error: "Survey not found" });
  }

  res.json({ success: true });
});

app.get("/api/stats", (req, res) => {
  if (db) {
    try {
      const stmt = db.prepare("SELECT COUNT(*) as total, AVG(rating) as avgRating FROM surveys WHERE rating IS NOT NULL");
      return res.json(stmt.get());
    } catch (err) {
      // Fallback to mockStore stats
    }
  }
  
  const completed = mockStore.filter(s => s.rating !== null);
  const total = completed.length;
  const avgRating = total > 0 ? completed.reduce((acc, s) => acc + (s.rating || 0), 0) / total : 0;
  res.json({ total, avgRating });
});

// Admin Routes
app.get("/api/admin/surveys", (req, res) => {
  if (db) {
    try {
      const stmt = db.prepare("SELECT * FROM surveys ORDER BY created_at DESC");
      return res.json(stmt.all());
    } catch (err) {
      // Fallback
    }
  }
  res.json([...mockStore].reverse());
});

app.delete("/api/admin/surveys/:id", (req, res) => {
  if (db) {
    try {
      const stmt = db.prepare("DELETE FROM surveys WHERE id = ?");
      stmt.run(req.params.id);
    } catch (err) {
      mockStore = mockStore.filter(s => s.id !== req.params.id);
    }
  } else {
    mockStore = mockStore.filter(s => s.id !== req.params.id);
  }
  res.json({ success: true });
});

// GitHub OAuth & Sync Routes
app.get("/api/auth/github/url", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${getAppUrl(req)}/auth/github/callback`,
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
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${token}` }
    });
    const user = await userRes.json();

    await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: { 
        Authorization: `token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: repoName, private: true })
    });

    const filesToSync = [
      "package.json", "server.ts", "src/App.tsx", "src/main.tsx", 
      "src/index.css", "metadata.json", "vite.config.ts", "tsconfig.json",
      "src/components/AgentPage.tsx", "src/components/SurveyPage.tsx",
      "src/components/GiftPage.tsx", "src/components/AdminPage.tsx",
      "vercel.json"
    ];

    for (const file of filesToSync) {
      try {
        const content = await fs.readFile(path.join(__dirname, file), "utf8");
        const pathUrl = `https://api.github.com/repos/${user.login}/${repoName}/contents/${file}`;
        
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
async function setupVite() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
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
}

setupVite();

// Export for Vercel
export default app;

// Only listen if running directly (not as a serverless function)
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
