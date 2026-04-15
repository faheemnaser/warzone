import { Session } from "../types";

const BASE = "/api";

export async function loadSessions(): Promise<Session[]> {
  try {
    const res = await fetch(`${BASE}/sessions`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createSession(session: Session): Promise<Session> {
  const res = await fetch(`${BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export async function saveSession(session: Session): Promise<void> {
  const res = await fetch(`${BASE}/sessions/${session.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error("Failed to save session");
}

export async function getSession(id: string): Promise<Session | null> {
  try {
    const res = await fetch(`${BASE}/sessions/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function deleteSession(id: string): Promise<void> {
  await fetch(`${BASE}/sessions/${id}`, { method: "DELETE" });
}
