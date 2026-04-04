import type {
  GeneratedBoard,
  MatchCommandType,
  MatchPlayerSummaryView,
  MatchView,
  ResourceCounts,
  ResourceType,
  RoomStartBlocker,
  RoomView,
  ServerMessage,
} from "@siedler/shared-types";

export interface RoomStatusBadge {
  label: string;
  tone: "success" | "warning" | "danger" | "muted";
}

const RESOURCE_LABELS: Record<ResourceType, string> = {
  wood: "Holz",
  brick: "Lehm",
  sheep: "Wolle",
  wheat: "Getreide",
  ore: "Erz",
};

export function roomBlockerCopy(blocker: RoomStartBlocker): string {
  switch (blocker) {
    case "MIN_PLAYERS":
      return "Mindestens drei Spieler muessen am Tisch sitzen.";
    case "UNREADY_PLAYERS":
      return "Alle belegten Sitze muessen bereit sein.";
    case "ROOM_NOT_OPEN":
      return "Der Raum ist gerade nicht startbereit.";
  }

  return blocker;
}

export function roomStatusBadge(room: RoomView): RoomStatusBadge {
  switch (room.roomStatus) {
    case "room_open_prematch":
      return {
        label: room.canStartMatch ? "Startbereit" : "Lobby",
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
    return "Kein Match";
  }

  if (match.matchStatus === "match_setup") {
    return "Setup";
  }

  if (match.matchStatus === "match_finished") {
    return "Beendet";
  }

  switch (match.turnPhase) {
    case "pre_roll_devcard_window":
      return "Vor dem Wurf";
    case "roll_pending":
      return "Wuerfeln";
    case "discard_pending":
      return "Discard";
    case "robber_pending":
      return "Raeuber";
    case "action_phase":
      return "Aktionsphase";
    case "devcard_resolution":
      return "Karteneffekt";
    default:
      return match.turnPhase?.replaceAll("_", " ") ?? match.matchStatus;
  }
}

export function actionLabel(action: MatchCommandType): string {
  switch (action) {
    case "ROLL_DICE":
      return "Wuerfeln";
    case "END_TURN":
      return "Zug beenden";
    case "BUILD_ROAD":
      return "Strasse bauen";
    case "BUILD_SETTLEMENT":
      return "Siedlung bauen";
    case "UPGRADE_CITY":
      return "Stadt bauen";
    case "BUY_DEV_CARD":
      return "Entwicklungskarte kaufen";
    case "PLAY_DEV_CARD_KNIGHT":
      return "Knight spielen";
    case "PLAY_DEV_CARD_YEAR_OF_PLENTY":
      return "Year of Plenty";
    case "PLAY_DEV_CARD_MONOPOLY":
      return "Monopoly";
    case "PLAY_DEV_CARD_ROAD_BUILDING":
      return "Road Building";
    case "OFFER_TRADE":
      return "Handel anbieten";
    case "TRADE_WITH_BANK":
      return "Mit Bank handeln";
    case "CONFIRM_TRADE":
      return "Handel bestaetigen";
    case "CANCEL_TRADE":
      return "Handel abbrechen";
    case "DISCARD_RESOURCES":
      return "Karten abwerfen";
    case "MOVE_ROBBER":
      return "Raeuber setzen";
    case "STEAL_RESOURCE":
      return "Ressource stehlen";
    case "PICK_YEAR_OF_PLENTY_RESOURCE":
      return "Ressource waehlen";
    case "PICK_MONOPOLY_RESOURCE_TYPE":
      return "Typ waehlen";
    case "RESPOND_TRADE":
      return "Auf Handel reagieren";
    case "PLACE_INITIAL_SETTLEMENT":
      return "Start-Siedlung";
    case "PLACE_INITIAL_ROAD":
      return "Start-Strasse";
  }
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
    { type: "wood", label: RESOURCE_LABELS.wood, count: counts.wood },
    { type: "brick", label: RESOURCE_LABELS.brick, count: counts.brick },
    { type: "sheep", label: RESOURCE_LABELS.sheep, count: counts.sheep },
    { type: "wheat", label: RESOURCE_LABELS.wheat, count: counts.wheat },
    { type: "ore", label: RESOURCE_LABELS.ore, count: counts.ore },
  ] as const;
}

export function resourceLabel(resource: ResourceType): string {
  return RESOURCE_LABELS[resource];
}

export function developmentCardEntries(cards: MatchView["ownDevelopmentCards"] | undefined) {
  const next = cards ?? {
    knight: 0,
    victory_point: 0,
    year_of_plenty: 0,
    monopoly: 0,
    road_building: 0,
  };

  return [
    { type: "knight", label: "Knight", count: next.knight, action: "PLAY_DEV_CARD_KNIGHT" as const },
    { type: "year_of_plenty", label: "Year of Plenty", count: next.year_of_plenty, action: "PLAY_DEV_CARD_YEAR_OF_PLENTY" as const },
    { type: "monopoly", label: "Monopoly", count: next.monopoly, action: "PLAY_DEV_CARD_MONOPOLY" as const },
    { type: "road_building", label: "Road Building", count: next.road_building, action: "PLAY_DEV_CARD_ROAD_BUILDING" as const },
    { type: "victory_point", label: "Victory Point", count: next.victory_point, action: undefined },
  ];
}

export function playerColorToken(color: string | undefined): string {
  switch (color) {
    case "red":
      return "player-red";
    case "blue":
      return "player-blue";
    case "white":
      return "player-white";
    case "orange":
      return "player-orange";
    default:
      return "player-neutral";
  }
}

export function summarizeLogEntry(message: ServerMessage): string {
  switch (message.type) {
    case "server.command_accepted":
      return message.effectsSummary ? `Aktion erfolgreich: ${message.effectsSummary}` : "Aktion erfolgreich.";
    case "server.command_rejected":
      return `Aktion abgewiesen: ${message.message}`;
    case "server.lifecycle_transition":
      return `${message.context} wechselt von ${message.fromState} zu ${message.toState}.`;
    case "server.room_snapshot":
      return `Raum ${message.room.roomCode} synchronisiert.`;
    case "server.room_updated":
      return `Lobby-Update: ${message.room.roomStatus}.`;
    case "server.match_snapshot":
      return message.playerView.actionContext?.title
        ? `${message.playerView.actionContext.title}.`
        : `Match-Update: ${matchPhaseLabel(message.playerView)}.`;
    case "server.presence_updated":
      return `${message.playerId} ist jetzt ${message.presence}.`;
    case "server.session_attached":
      return `Session verbunden: ${message.resumeContext}.`;
  }

  return "Neues Spielereignis.";
}

export function buildPlayerLookup(room: RoomView | undefined) {
  return new Map((room?.playerSummaries ?? []).map((player) => [player.playerId, player]));
}

export function boardBounds(board: GeneratedBoard | undefined) {
  if (!board) {
    return {
      minX: 0,
      minY: 0,
      width: 100,
      height: 100,
    };
  }

  const hexCenters = Object.values(board.hexes).map((hex) => hex.uiCenter);
  const xs = hexCenters.map((point) => point.x);
  const ys = hexCenters.map((point) => point.y);
  const padding = 2.4;

  const minX = Math.min(...xs) - padding;
  const maxX = Math.max(...xs) + padding;
  const minY = Math.min(...ys) - padding;
  const maxY = Math.max(...ys) + padding;

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function bestTradeRatioByResource(board: GeneratedBoard | undefined, playerId: string | undefined) {
  const defaults: Record<ResourceType, 2 | 3 | 4> = {
    wood: 4,
    brick: 4,
    sheep: 4,
    wheat: 4,
    ore: 4,
  };

  if (!board || !playerId) {
    return defaults;
  }

  for (const intersection of Object.values(board.intersections)) {
    if (intersection.building?.ownerPlayerId !== playerId || !intersection.harborAccess) {
      continue;
    }

    if (intersection.harborAccess === "generic_3_to_1") {
      for (const resource of Object.keys(defaults) as ResourceType[]) {
        defaults[resource] = Math.min(defaults[resource], 3) as 2 | 3 | 4;
      }
      continue;
    }

    const resource = intersection.harborAccess.replace("_2_to_1", "") as ResourceType;
    defaults[resource] = 2;
  }

  return defaults;
}

export function playerStatusText(player: MatchPlayerSummaryView) {
  if (player.isActive) {
    return "Am Zug";
  }
  if (player.tradeResponse === "accept") {
    return "Handel ok";
  }
  if (player.tradeResponse === "reject") {
    return "Handel nein";
  }
  return "Wartet";
}
