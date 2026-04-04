import { Pool, neonConfig } from "@neondatabase/serverless";
import { InMemoryRealtimeService, type InMemoryRealtimeServiceState } from "@siedler/realtime";
import { WebSocket } from "ws";

const STATE_KEY = "singleton";

neonConfig.webSocketConstructor = WebSocket;

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("DATABASE_URL is required for the Neon-backed realtime store.");
  }
  return value;
}

interface StoredRealtimeStateRow {
  payload: InMemoryRealtimeServiceState;
  version: number;
}

interface DatabaseSession {
  query: Pool["query"];
}

async function withDatabaseClient<T>(operation: (client: Pool) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: databaseUrl() });
  try {
    return await operation(pool);
  } finally {
    await pool.end();
  }
}

async function ensureRealtimeSchemaOn(session: DatabaseSession): Promise<void> {
  await session.query(`
    CREATE TABLE IF NOT EXISTS realtime_state (
      state_key TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      version BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await session.query(`
    ALTER TABLE realtime_state
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0
  `);
}

export async function ensureRealtimeSchema(): Promise<void> {
  await withDatabaseClient((pool) => ensureRealtimeSchemaOn(pool));
}

async function ensureStateRow(session: DatabaseSession): Promise<void> {
  const emptyState = new InMemoryRealtimeService().exportState();
  await session.query(
    `
      INSERT INTO realtime_state (state_key, payload, version, updated_at)
      VALUES ($1, $2::jsonb, 0, NOW())
      ON CONFLICT (state_key) DO NOTHING
    `,
    [STATE_KEY, JSON.stringify(emptyState)],
  );
}

async function readRealtimeState(session: DatabaseSession, lockRow: boolean): Promise<StoredRealtimeStateRow> {
  await ensureRealtimeSchemaOn(session);
  await ensureStateRow(session);
  const result = await session.query<StoredRealtimeStateRow>(
    `
      SELECT payload, version
      FROM realtime_state
      WHERE state_key = $1
      ${lockRow ? "FOR UPDATE" : ""}
    `,
    [STATE_KEY],
  );

  return result.rows[0] ?? {
    payload: new InMemoryRealtimeService().exportState(),
    version: 0,
  };
}

export async function loadRealtimeService(): Promise<InMemoryRealtimeService> {
  const row = await withDatabaseClient((pool) => readRealtimeState(pool, false));

  const service = new InMemoryRealtimeService();
  service.importState(row.payload);

  return service;
}

export async function mutateRealtimeState<T>(mutator: (service: InMemoryRealtimeService) => T | Promise<T>): Promise<T> {
  return withDatabaseClient(async (pool) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await ensureRealtimeSchemaOn(client);
      await ensureStateRow(client);
      const row = await readRealtimeState(client, true);

      const service = new InMemoryRealtimeService();
      service.importState(row.payload);

      const result = await mutator(service);

      await client.query(
        `
          UPDATE realtime_state
          SET payload = $2::jsonb,
              version = version + 1,
              updated_at = NOW()
          WHERE state_key = $1
        `,
        [STATE_KEY, JSON.stringify(service.exportState())],
      );

      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
}

export async function checkDatabaseHealth() {
  return withDatabaseClient(async (pool) => {
    await ensureRealtimeSchemaOn(pool);
    const result = await pool.query<{ now: string }>("SELECT NOW()::text AS now");
    return {
      database: "ok" as const,
      checkedAt: result.rows[0]?.now ?? new Date().toISOString(),
    };
  });
}
