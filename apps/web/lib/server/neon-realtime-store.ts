import { neon } from "@neondatabase/serverless";
import { InMemoryRealtimeService, type InMemoryRealtimeServiceState } from "@siedler/realtime";

const STATE_KEY = "singleton";

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("DATABASE_URL is required for the Neon-backed realtime store.");
  }
  return value;
}

function createSql() {
  return neon(databaseUrl());
}

export async function ensureRealtimeSchema(): Promise<void> {
  const sql = createSql();
  await sql`
    CREATE TABLE IF NOT EXISTS realtime_state (
      state_key TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function loadRealtimeService(): Promise<InMemoryRealtimeService> {
  await ensureRealtimeSchema();
  const sql = createSql();
  const rows = (await sql`
    SELECT payload
    FROM realtime_state
    WHERE state_key = ${STATE_KEY}
    LIMIT 1
  `) as Array<{ payload: InMemoryRealtimeServiceState }>;

  const service = new InMemoryRealtimeService();
  const row = rows[0];
  if (row?.payload) {
    service.importState(row.payload);
  }

  return service;
}

export async function saveRealtimeService(service: InMemoryRealtimeService): Promise<void> {
  await ensureRealtimeSchema();
  const sql = createSql();
  const payload = service.exportState();
  await sql`
    INSERT INTO realtime_state (state_key, payload, updated_at)
    VALUES (${STATE_KEY}, ${JSON.stringify(payload)}::jsonb, NOW())
    ON CONFLICT (state_key)
    DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = NOW()
  `;
}
