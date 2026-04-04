import { neon } from "@neondatabase/serverless";
import { InMemoryRealtimeService, type InMemoryRealtimeServiceState } from "@siedler/realtime";

const STATE_KEY = "singleton";
const MAX_MUTATION_RETRIES = 8;

interface StoredRealtimeStateRow {
  payload: InMemoryRealtimeServiceState;
  version: number;
}

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

function createSqlFullResults() {
  return neon(databaseUrl(), { fullResults: true });
}

async function ensureRealtimeSchemaInternal() {
  const sql = createSql();
  const emptyState = new InMemoryRealtimeService().exportState();

  await sql`
    CREATE TABLE IF NOT EXISTS realtime_state (
      state_key TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      version BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    ALTER TABLE realtime_state
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0
  `;

  await sql(
    `
      INSERT INTO realtime_state (state_key, payload, version, updated_at)
      VALUES ($1, $2::jsonb, 0, NOW())
      ON CONFLICT (state_key) DO NOTHING
    `,
    [STATE_KEY, JSON.stringify(emptyState)],
  );
}

async function readRealtimeStateRow(): Promise<StoredRealtimeStateRow> {
  await ensureRealtimeSchemaInternal();
  const sql = createSql();
  const rows = (await sql(
    `
      SELECT payload, version
      FROM realtime_state
      WHERE state_key = $1
      LIMIT 1
    `,
    [STATE_KEY],
  )) as Array<{ payload: InMemoryRealtimeServiceState; version: number }>;

  const row = rows[0];
  if (row) {
    return {
      payload: row.payload,
      version: Number(row.version),
    };
  }

  return {
    payload: new InMemoryRealtimeService().exportState(),
    version: 0,
  };
}

export async function ensureRealtimeSchema(): Promise<void> {
  await ensureRealtimeSchemaInternal();
}

export async function loadRealtimeService(): Promise<InMemoryRealtimeService> {
  const row = await readRealtimeStateRow();
  const service = new InMemoryRealtimeService();
  service.importState(row.payload);
  return service;
}

export async function mutateRealtimeState<T>(mutator: (service: InMemoryRealtimeService) => T | Promise<T>): Promise<T> {
  await ensureRealtimeSchemaInternal();

  for (let attempt = 0; attempt < MAX_MUTATION_RETRIES; attempt += 1) {
    const current = await readRealtimeStateRow();
    const service = new InMemoryRealtimeService();
    service.importState(current.payload);

    const result = await mutator(service);
    const nextPayload = JSON.stringify(service.exportState());
    const sqlFull = createSqlFullResults();
    const update = await sqlFull(
      `
        UPDATE realtime_state
        SET payload = $2::jsonb,
            version = version + 1,
            updated_at = NOW()
        WHERE state_key = $1
          AND version = $3
      `,
      [STATE_KEY, nextPayload, current.version],
    );

    if (update.rowCount === 1) {
      return result;
    }
  }

  throw new Error("Unable to persist realtime state after repeated concurrent update retries.");
}

export async function checkDatabaseHealth() {
  await ensureRealtimeSchemaInternal();
  const sql = createSql();
  const rows = (await sql`SELECT NOW()::text AS now`) as Array<{ now: string }>;
  return {
    database: "ok" as const,
    checkedAt: rows[0]?.now ?? new Date().toISOString(),
  };
}
