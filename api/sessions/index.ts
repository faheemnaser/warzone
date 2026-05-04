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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");
  const supabase = getSupabase();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("sessions")
      .select("data")
      .order("created_at", { ascending: false });
    if (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }));
      return;
    }
    res.end(JSON.stringify((data ?? []).map((row: any) => row.data)));
    return;
  }

  if (req.method === "POST") {
    const session = (await readBody(req)) as Record<string, unknown>;
    if (!session?.id) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Session must have an id" }));
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
    res.statusCode = 201;
    res.end(JSON.stringify(session));
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: "Method not allowed" }));
}
