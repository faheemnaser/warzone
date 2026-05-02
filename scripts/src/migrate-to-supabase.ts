import Database from "@replit/database";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env["SUPABASE_URL"];
const supabaseKey = process.env["SUPABASE_ANON_KEY"];

if (!supabaseUrl) throw new Error("SUPABASE_URL is required");
if (!supabaseKey) throw new Error("SUPABASE_ANON_KEY is required");

const replitDb = new Database();
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log("Starting migration from Replit DB → Supabase...");

  const idsResult = await replitDb.get("wso_session_ids");
  if (!idsResult.ok || !idsResult.value) {
    console.log("No session IDs found in Replit DB. Nothing to migrate.");
    return;
  }

  const ids = idsResult.value as string[];
  console.log(`Found ${ids.length} session(s) to migrate: ${ids.join(", ")}`);

  let migrated = 0;
  let failed = 0;

  for (const id of ids) {
    const sessionResult = await replitDb.get(`wso_session:${id}`);
    if (!sessionResult.ok || !sessionResult.value) {
      console.warn(`  ⚠ Session ${id} not found in Replit DB, skipping.`);
      failed++;
      continue;
    }

    const session = sessionResult.value;

    const { error } = await supabase
      .from("sessions")
      .upsert({ id, data: session }, { onConflict: "id" });

    if (error) {
      console.error(`  ✗ Failed to migrate session ${id}:`, error.message);
      failed++;
    } else {
      console.log(`  ✓ Migrated session ${id}`);
      migrated++;
    }
  }

  console.log(`\nMigration complete: ${migrated} succeeded, ${failed} failed.`);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
