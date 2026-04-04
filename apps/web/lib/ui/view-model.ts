import type { GeneratedBoard, MatchCommandType, MatchView, ResourceCounts, RoomStartBlocker, RoomView, ServerMessage } from "@siedler/shared-types";

export interface RoomStatusBadge {
  label: string;
  tone: "success" | "warning" | "danger" | "muted";
}

export interface ForcedFlowModel {
  title: string;
  description: string;
}

export function roomBlockerCopy(blocker: RoomStartBlocker): string {
  switch (blocker) {
    case "MIN_PLAYERS":
      return "Mindestens drei Spieler werden benötigt.";
    case "UNREADY_PLAYERS":
      return "Alle belegten Sitze müssen bereit sein.";
    case "ROOM_NOT_OPEN":
      return "Der Raum ist gerade nicht im Startzustand.";
  }

  return blocker;
}

export function roomStatusBadge(room: RoomView): RoomStatusBadge {
  switch (room.roomStatus) {
    case "room_open_prematch":
      return {
        label: room.canStartMatch ? "Startbereit" : "Vorbereitung",
        tone: room.canStartMatch ? "success" : "warning",
      };
    case "room_match_starting":
      return {
        label: "Match startet",
        tone: "warning",
      };
    case "room_match_in_progress":
      return {
        label: "Match live",
        tone: "success",
      };
    case "room_postgame":
      return {
        label: "Postgame",
        tone: "muted",
      };
    case "room_closed":
      return {
        label: "Geschlossen",
        tone: "danger",
      };
  }

  return {
    label: room.roomStatus,
    tone: "muted",
  };
}

export function matchPhaseLabel(match: MatchView | undefined): string {
  if (!match) {
    return "Kein Match aktiv";
  }

  if (match.matchStatus === "match_setup") {
    return `Setup · ${match.setupStep ?? "initialisierung"}`;
  }

  if (match.matchStatus === "match_finished") {
    return "Match beendet";
  }

  return match.turnPhase?.replaceAll("_", " ") ?? match.matchStatus;
}

export function forcedFlowCopy(match: MatchView | undefined): ForcedFlowModel | undefined {
  if (!match?.requiredAction) {
    return undefined;
  }

  switch (match.requiredAction) {
    case "PLACE_INITIAL_SETTLEMENT":
      return {
        title: "Start-Siedlung platzieren",
        description: "Waehle eine legale Intersection fuer die aktuelle Setup-Runde.",
      };
    case "PLACE_INITIAL_ROAD":
      return {
        title: "Start-Strasse platzieren",
        description: "Die Strasse muss an deine zuletzt gesetzte Setup-Siedlung angrenzen.",
      };
    case "ROLL_DICE":
      return {
        title: "Wuerfeln",
        description: "Ohne Wurf geht der Zug nicht weiter.",
      };
    case "DISCARD_RESOURCES":
      return {
        title: "Ressourcen abwerfen",
        description: `Lege exakt ${match.requiredDiscardCount ?? 0} Karten ab, damit die 7er-Aufloesung weitergehen kann.`,
      };
    case "MOVE_ROBBER":
      return {
        title: "Raeuber versetzen",
        description: "Waehle ein anderes Hex. Danach folgt gegebenenfalls der Steal-Schritt.",
      };
    case "STEAL_RESOURCE":
      return {
        title: "Zielspieler berauben",
        description: "Waehle genau einen legalen Zielspieler am aktuellen Raeuber-Feld.",
      };
    case "PICK_YEAR_OF_PLENTY_RESOURCE":
      return {
        title: "Ressource waehlen",
        description: "Year of Plenty verlangt zwei konkrete Ressourcenauswahlen.",
      };
    case "PICK_MONOPOLY_RESOURCE_TYPE":
      return {
        title: "Ressourcentyp bestimmen",
        description: "Monopoly sammelt danach alle Karten dieses Typs von den Gegnern ein.",
      };
    case "RESPOND_TRADE":
      return {
        title: "Auf Trade reagieren",
        description: "Dieses Angebot ist offen und erwartet deine Annahme oder Ablehnung.",
      };
    case "BUILD_ROAD":
      return {
        title: "Strassen-Effekt fortsetzen",
        description: "Road Building ist noch nicht abgeschlossen.",
      };
    default:
      return {
        title: match.requiredAction.replaceAll("_", " "),
        description: "Diese Aktion hat gerade Vorrang vor allen anderen Schritten.",
      };
  }
}

export function isActionEnabled(match: MatchView | undefined, action: MatchCommandType): boolean {
  return !!match?.allowedActions?.includes(action);
}

export function resourceEntries(resources: ResourceCounts | undefined) {
  const counts = resources ?? {
    wood: 0,
    brick: 0,
    sheep: 0,
    wheat: 0,
    ore: 0,
  };

  return [
    { type: "wood", label: "Wood", count: counts.wood },
    { type: "brick", label: "Brick", count: counts.brick },
    { type: "sheep", label: "Sheep", count: counts.sheep },
    { type: "wheat", label: "Wheat", count: counts.wheat },
    { type: "ore", label: "Ore", count: counts.ore },
  ] as const;
}

export function summarizeLogEntry(message: ServerMessage): string {
  switch (message.type) {
    case "server.command_accepted":
      return `Command akzeptiert · ${message.effectsSummary ?? message.commandId}`;
    case "server.command_rejected":
      return `Command abgewiesen · ${message.reasonCode}`;
    case "server.lifecycle_transition":
      return `${message.context} · ${message.fromState} -> ${message.toState}`;
    case "server.room_snapshot":
      return `Room Snapshot · ${message.room.roomCode}`;
    case "server.room_updated":
      return `Room Update · ${message.room.roomStatus}`;
    case "server.match_snapshot":
      return `Match Snapshot · ${matchPhaseLabel(message.playerView)}`;
    case "server.presence_updated":
      return `Presence · ${message.playerId} ist ${message.presence}`;
    case "server.session_attached":
      return `Session attached · ${message.resumeContext}`;
  }

  return "unhandled event";
}

export function boardRows(board: GeneratedBoard | undefined) {
  if (!board) {
    return [];
  }

  const rows = new Map<number, typeof board.hexOrder>();
  for (const hexId of board.hexOrder) {
    const hex = board.hexes[hexId];
    if (!hex) {
      continue;
    }
    const row = rows.get(hex.axialCoord.r) ?? [];
    row.push(hexId);
    rows.set(hex.axialCoord.r, row);
  }

  return [...rows.entries()].sort(([left], [right]) => left - right);
}
