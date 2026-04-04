import type { MatchCommandType, PlayerColor, PlayerCount } from "@siedler/shared-types";
import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 16 * 1024;
const MUTATION_WINDOW_MS = 10_000;
const MUTATION_LIMIT = 40;
const READ_WINDOW_MS = 10_000;
const READ_LIMIT = 120;

const ROOM_ACTIONS = ["toggle_ready", "reassign_seat", "reassign_color", "start_match", "reattach"] as const;
const PLAYER_COLORS = ["red", "blue", "white", "orange"] as const satisfies PlayerColor[];
const PLAYER_COUNTS = [3, 4] as const satisfies PlayerCount[];
const MATCH_COMMAND_TYPES = [
  "PLACE_INITIAL_SETTLEMENT",
  "PLACE_INITIAL_ROAD",
  "ROLL_DICE",
  "END_TURN",
  "BUILD_ROAD",
  "BUILD_SETTLEMENT",
  "UPGRADE_CITY",
  "DISCARD_RESOURCES",
  "MOVE_ROBBER",
  "STEAL_RESOURCE",
  "BUY_DEV_CARD",
  "PLAY_DEV_CARD_KNIGHT",
  "PLAY_DEV_CARD_YEAR_OF_PLENTY",
  "PICK_YEAR_OF_PLENTY_RESOURCE",
  "PLAY_DEV_CARD_MONOPOLY",
  "PICK_MONOPOLY_RESOURCE_TYPE",
  "PLAY_DEV_CARD_ROAD_BUILDING",
  "OFFER_TRADE",
  "RESPOND_TRADE",
  "CONFIRM_TRADE",
  "CANCEL_TRADE",
  "TRADE_WITH_BANK",
] as const satisfies MatchCommandType[];

const rateBuckets = new Map<string, number[]>();

type JsonObject = Record<string, unknown>;

export class ApiRouteError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly reasonCode: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pruneRateBucket(timestamps: number[], now: number, windowMs: number) {
  return timestamps.filter((timestamp) => now - timestamp < windowMs);
}

function clientAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function rateLimitKey(request: Request, scope: string, identifier?: string) {
  return `${scope}:${identifier ?? "anonymous"}:${clientAddress(request)}`;
}

function enforceRateLimit(request: Request, scope: string, identifier: string | undefined, limit: number, windowMs: number) {
  const key = rateLimitKey(request, scope, identifier);
  const now = Date.now();
  const current = pruneRateBucket(rateBuckets.get(key) ?? [], now, windowMs);
  if (current.length >= limit) {
    throw new ApiRouteError("Too many requests.", 429, "rate_limited", { scope });
  }
  current.push(now);
  rateBuckets.set(key, current);
}

function requireString(body: JsonObject, field: string, maxLength: number): string {
  const value = body[field];
  if (typeof value !== "string") {
    throw new ApiRouteError(`Field "${field}" must be a string.`, 400, "invalid_body", { field });
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    throw new ApiRouteError(`Field "${field}" has invalid length.`, 400, "invalid_body", { field });
  }

  return trimmed;
}

function optionalBoolean(body: JsonObject, field: string): boolean | undefined {
  const value = body[field];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new ApiRouteError(`Field "${field}" must be a boolean.`, 400, "invalid_body", { field });
  }
  return value;
}

function optionalInteger(body: JsonObject, field: string, minimum = 0): number | undefined {
  const value = body[field];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) {
    throw new ApiRouteError(`Field "${field}" must be an integer >= ${minimum}.`, 400, "invalid_body", { field });
  }
  return value;
}

function optionalObject(body: JsonObject, field: string): Record<string, unknown> | undefined {
  const value = body[field];
  if (value === undefined) {
    return undefined;
  }
  if (!isPlainObject(value)) {
    throw new ApiRouteError(`Field "${field}" must be an object.`, 400, "invalid_body", { field });
  }
  return value;
}

function optionalEnum<T extends readonly string[]>(body: JsonObject, field: string, allowed: T): T[number] | undefined {
  const value = body[field];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new ApiRouteError(`Field "${field}" has invalid value.`, 400, "invalid_body", { field });
  }
  return value as T[number];
}

function optionalLiteral<T extends readonly (string | number)[]>(body: JsonObject, field: string, allowed: T): T[number] | undefined {
  const value = body[field];
  if (value === undefined) {
    return undefined;
  }
  if (!allowed.includes(value as T[number])) {
    throw new ApiRouteError(`Field "${field}" has invalid value.`, 400, "invalid_body", { field });
  }
  return value as T[number];
}

async function readRequestJson(request: Request): Promise<JsonObject> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number.parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    throw new ApiRouteError("Request body too large.", 413, "payload_too_large");
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new ApiRouteError("Request body too large.", 413, "payload_too_large");
  }

  let parsed: unknown;
  try {
    parsed = text.length === 0 ? {} : JSON.parse(text);
  } catch {
    throw new ApiRouteError("Malformed JSON body.", 400, "invalid_json");
  }

  if (!isPlainObject(parsed)) {
    throw new ApiRouteError("Request body must be a JSON object.", 400, "invalid_body");
  }

  return parsed;
}

export async function parseCreateRoomRequest(request: Request) {
  const body = await readRequestJson(request);
  const sessionId = requireString(body, "sessionId", 64);
  enforceRateLimit(request, "room_create", sessionId, MUTATION_LIMIT, MUTATION_WINDOW_MS);
  const maxPlayers = optionalLiteral(body, "maxPlayers", PLAYER_COUNTS);

  return {
    sessionId,
    playerId: requireString(body, "playerId", 64),
    displayName: requireString(body, "displayName", 40),
    ...(maxPlayers !== undefined ? { maxPlayers } : {}),
  };
}

export async function parseJoinRoomRequest(request: Request) {
  const body = await readRequestJson(request);
  const sessionId = requireString(body, "sessionId", 64);
  enforceRateLimit(request, "room_join", sessionId, MUTATION_LIMIT, MUTATION_WINDOW_MS);

  return {
    sessionId,
    playerId: requireString(body, "playerId", 64),
    displayName: requireString(body, "displayName", 40),
    roomCode: requireString(body, "roomCode", 8).toUpperCase(),
  };
}

export async function parseRoomActionRequest(request: Request) {
  const body = await readRequestJson(request);
  const sessionId = requireString(body, "sessionId", 64);
  enforceRateLimit(request, "room_action", sessionId, MUTATION_LIMIT, MUTATION_WINDOW_MS);
  const action = optionalEnum(body, "action", ROOM_ACTIONS);
  const ready = optionalBoolean(body, "ready");
  const targetPlayerId = body.targetPlayerId === undefined ? undefined : requireString(body, "targetPlayerId", 64);
  const seatIndex = optionalInteger(body, "seatIndex", 0);
  const color = optionalEnum(body, "color", PLAYER_COLORS);
  if (!action) {
    throw new ApiRouteError('Field "action" is required.', 400, "invalid_body", { field: "action" });
  }

  return {
    sessionId,
    action,
    ...(ready !== undefined ? { ready } : {}),
    ...(targetPlayerId !== undefined ? { targetPlayerId } : {}),
    ...(seatIndex !== undefined ? { seatIndex } : {}),
    ...(color !== undefined ? { color } : {}),
  };
}

export async function parseMatchCommandRequest(request: Request) {
  const body = await readRequestJson(request);
  const sessionId = requireString(body, "sessionId", 64);
  enforceRateLimit(request, "match_command", sessionId, MUTATION_LIMIT, MUTATION_WINDOW_MS);
  const commandType = optionalEnum(body, "commandType", MATCH_COMMAND_TYPES);
  const payload = optionalObject(body, "payload");
  const clientStateVersion = optionalInteger(body, "clientStateVersion", 0);
  if (!commandType) {
    throw new ApiRouteError('Field "commandType" is required.', 400, "invalid_body", { field: "commandType" });
  }

  return {
    sessionId,
    commandId: requireString(body, "commandId", 128),
    matchId: requireString(body, "matchId", 64),
    commandType,
    ...(payload !== undefined ? { payload } : {}),
    ...(clientStateVersion !== undefined ? { clientStateVersion } : {}),
  };
}

export function parseSessionStateRequest(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId")?.trim();
  if (!sessionId || sessionId.length > 64) {
    throw new ApiRouteError("sessionId is required.", 400, "invalid_query", { field: "sessionId" });
  }

  enforceRateLimit(request, "session_state", sessionId, READ_LIMIT, READ_WINDOW_MS);
  return { sessionId };
}

export function jsonNoStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export function logApiEvent(level: "info" | "warn" | "error", event: string, meta: Record<string, unknown>) {
  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  logger(JSON.stringify({ level, event, ...meta }));
}

export function toErrorResponse(error: unknown, fallbackMessage: string, meta: Record<string, unknown>) {
  if (error instanceof ApiRouteError) {
    logApiEvent(error.status >= 500 ? "error" : "warn", "api_error", {
      ...meta,
      reasonCode: error.reasonCode,
      status: error.status,
      details: error.details,
      message: error.message,
    });

    return jsonNoStore(
      {
        error: error.message,
        reasonCode: error.reasonCode,
        ...(error.details ? { details: error.details } : {}),
      },
      error.status,
    );
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  logApiEvent("error", "api_error", {
    ...meta,
    reasonCode: "internal_error",
    status: 500,
    message,
  });

  return jsonNoStore(
    {
      error: fallbackMessage,
      reasonCode: "internal_error",
    },
    500,
  );
}
