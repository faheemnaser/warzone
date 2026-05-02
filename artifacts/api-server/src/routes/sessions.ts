import { Router } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/sessions", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("data")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json((data ?? []).map((row) => row.data));
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
    const { error } = await supabase
      .from("sessions")
      .upsert({ id: session.id, data: session }, { onConflict: "id" });

    if (error) throw error;
    res.status(201).json(session);
  } catch (err) {
    req.log.error({ err }, "Failed to create session");
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/sessions/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("data")
      .eq("id", req.params.id)
      .single();

    if (error || !data) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(data.data);
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
    const { error } = await supabase
      .from("sessions")
      .upsert({ id: session.id, data: session }, { onConflict: "id" });

    if (error) throw error;
    res.json(session);
  } catch (err) {
    req.log.error({ err }, "Failed to update session");
    res.status(500).json({ error: "Failed to update session" });
  }
});

router.delete("/sessions/:id", async (req, res) => {
  try {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete session");
    res.status(500).json({ error: "Failed to delete session" });
  }
});

export default router;
