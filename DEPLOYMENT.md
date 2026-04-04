# Deployment

## Production target

- Frontend/runtime host: Vercel
- App root directory: `apps/web`
- Database: Neon Postgres

## Required environment variables

- `DATABASE_URL`

## Vercel project settings

Set these fields in the Vercel project:

- Root Directory: `apps/web`
- Framework Preset: `Next.js`
- Install Command: `cd ../.. && npm install`
- Build Command: `cd ../.. && npm run build:vercel:web`
- Output Directory: leave empty
- Node.js Version: `20.x` or `22.x`

The same install/build commands are also checked into [apps/web/vercel.json](/Users/rahu/Downloads/SIEDLER/siedler_OG_II/apps/web/vercel.json).

## Local verification

Run from the repository root:

```bash
npm install
npm run typecheck
npm test
npm run build
cd apps/web && npm run build
```

## Neon checks

After the first successful deployment and first API write, verify:

```sql
SELECT state_key, version, updated_at
FROM realtime_state;
```

Expected:

- one row with `state_key = 'singleton'`
- `version` increasing after room or match mutations

## Health check

Production health endpoint:

```text
/api/health
```

Expected response:

```json
{
  "ok": true,
  "database": "ok",
  "checkedAt": "..."
}
```

## Smoke test

1. Open `/`
2. Create a room
3. Join from a second browser or device
4. Ready all seats
5. Start the match
6. Complete setup until `match_in_progress`
7. Reload the page and confirm resume/reattach
8. Finish a match and confirm return to room postgame

## Notes

- API routes run on the Node.js runtime and are forced dynamic.
- Session state reads are served with `Cache-Control: no-store`.
- Development-only sandbox helpers are hidden in production builds.
