import { Router } from "express";
import Database from "@replit/database";

const db = new Database();
const SESSION_IDS_KEY = "wso_session_ids";

function sessionKey(id: string) {
  return `wso_session:${id}`;
}

async function dbGet<T>(key: string): Promise<T | null> {
  const result = await db.get(key);
  if (!result.ok) return null;
  return (result as { ok: true; value: T | null }).value ?? null;
}

async function dbSet(key: string, value: unknown): Promise<void> {
  await db.set(key, value);
}

async function dbDelete(key: string): Promise<void> {
  await db.delete(key);
}

async function getSessionIds(): Promise<string[]> {
  const val = await dbGet<string[]>(SESSION_IDS_KEY);
  return Array.isArray(val) ? val : [];
}

const router = Router();

router.get("/sessions", async (req, res) => {
  try {
    const ids = await getSessionIds();
    const sessions = await Promise.all(ids.map((id) => dbGet(sessionKey(id))));
    res.json(sessions.filter(Boolean));
  } catch (err) {
    req.log.error({ err }, "Failed to list sessions");
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

router.post("/sessions", async (req, res) => {
  try {
    const session = req.body;
    if (!session?.id) {
      res.status(400).json({ error: "Session must have an id" });
      return;
    }
    await dbSet(sessionKey(session.id), session);
    const ids = await getSessionIds();
    if (!ids.includes(session.id)) {
      ids.push(session.id);
      await dbSet(SESSION_IDS_KEY, ids);
    }
    res.status(201).json(session);
  } catch (err) {
    req.log.error({ err }, "Failed to create session");
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/sessions/:id", async (req, res) => {
  try {
    const session = await dbGet(sessionKey(req.params.id));
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(session);
  } catch (err) {
    req.log.error({ err }, "Failed to get session");
    res.status(500).json({ error: "Failed to get session" });
  }
});

router.put("/sessions/:id", async (req, res) => {
  try {
    const session = req.body;
    if (!session?.id || session.id !== req.params.id) {
      res.status(400).json({ error: "Session id mismatch" });
      return;
    }
    await dbSet(sessionKey(session.id), session);
    const ids = await getSessionIds();
    if (!ids.includes(session.id)) {
      ids.push(session.id);
      await dbSet(SESSION_IDS_KEY, ids);
    }
    res.json(session);
  } catch (err) {
    req.log.error({ err }, "Failed to update session");
    res.status(500).json({ error: "Failed to update session" });
  }
});

router.delete("/sessions/:id", async (req, res) => {
  try {
    await dbDelete(sessionKey(req.params.id));
    const ids = await getSessionIds();
    const filtered = ids.filter((id) => id !== req.params.id);
    await dbSet(SESSION_IDS_KEY, filtered);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete session");
    res.status(500).json({ error: "Failed to delete session" });
  }
});

export default router;
