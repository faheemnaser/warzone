import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_ANON_KEY"];
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string> },
  res: ServerResponse,
) {
  res.setHeader("Content-Type", "application/json");
  const supabase = getSupabase();
  const id = req.query?.id ?? req.url?.split("/").pop() ?? "";

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("sessions")
      .select("data")
      .eq("id", id)
      .single();
    if (error || !data) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "Session not found" }));
      return;
    }
    res.end(JSON.stringify(data.data));
    return;
  }

  if (req.method === "PUT") {
    const session = (await readBody(req)) as Record<string, unknown>;
    if (!session?.id || session.id !== id) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Session id mismatch" }));
      return;
    }
    const { error } = await supabase
      .from("sessions")
      .upsert({ id: session.id, data: session }, { onConflict: "id" });
    if (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }));
      return;
    }
    res.end(JSON.stringify(session));
    return;
  }

  if (req.method === "DELETE") {
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }));
      return;
    }
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: "Method not allowed" }));
}
