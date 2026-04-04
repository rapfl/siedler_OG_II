import type { MatchSnapshotState } from "../realtime/local-client";
import {
  actionLabel,
  bestTradeRatioByResource,
  buildPlayerLookup,
  developmentCardEntries,
  matchPhaseLabel,
  roomStatusBadge,
} from "./view-model";
import type { MatchCommandType, MatchView, ResourceCounts } from "@siedler/shared-types";

const BOARD_ACTIONS = new Set<MatchCommandType>([
  "PLACE_INITIAL_SETTLEMENT",
  "PLACE_INITIAL_ROAD",
  "BUILD_ROAD",
  "BUILD_SETTLEMENT",
  "UPGRADE_CITY",
  "MOVE_ROBBER",
]);

export interface MatchScreenModel {
  roomCode?: string | undefined;
  roomBadgeLabel: string;
  roomBadgeTone: "success" | "warning" | "danger" | "muted";
  phaseLabel: string;
  boardMode?: MatchCommandType | undefined;
  requiredAction?: MatchCommandType | undefined;
  primaryAction: string;
  primaryDescription: string;
  players: Array<
    MatchView["players"][number] & {
      displayName: string;
      color?: string | undefined;
      presence?: string | undefined;
      isHost: boolean;
    }
  >;
  selfPlayer?: MatchView["players"][number] & {
    displayName: string;
    color?: string | undefined;
    presence?: string | undefined;
    isHost: boolean;
  } | undefined;
  tradeRatios: ReturnType<typeof bestTradeRatioByResource>;
}

export function createMatchScreenModel(
  snapshot: MatchSnapshotState,
  matchId: string,
  selectedBoardAction: MatchCommandType | undefined,
): MatchScreenModel | undefined {
  const room = snapshot.room;
  const match = snapshot.match?.matchId === matchId ? snapshot.match : undefined;
  if (!match) {
    return undefined;
  }

  const playerLookup = buildPlayerLookup(room);
  const players = match.players.map((player) => {
    const roomPlayer = playerLookup.get(player.playerId);
    return {
      ...player,
      displayName: roomPlayer?.displayName ?? player.playerId,
      color: roomPlayer?.color,
      presence: roomPlayer?.presence,
      isHost: roomPlayer?.isHost ?? false,
    };
  });
  const selfPlayer = players.find((player) => player.isSelf);
  const roomBadge = room ? roomStatusBadge(room) : { label: "Match", tone: "muted" as const };
  const requiredAction = match.requiredAction;
  const boardMode = BOARD_ACTIONS.has(requiredAction as MatchCommandType)
    ? requiredAction
    : selectedBoardAction && match.allowedActions?.includes(selectedBoardAction)
      ? selectedBoardAction
      : undefined;

  return {
    roomCode: room?.roomCode,
    roomBadgeLabel: roomBadge.label,
    roomBadgeTone: roomBadge.tone,
    phaseLabel: matchPhaseLabel(match),
    boardMode,
    requiredAction,
    primaryAction: match.actionContext?.title ?? (match.activePlayerId === match.playerId ? "Du bist am Zug" : "Warten"),
    primaryDescription:
      match.actionContext?.description ??
      (match.activePlayerId === match.playerId
        ? "Nutze die untere Dock-Leiste fuer Aktion, Build und Karten. Das Brett bleibt immer sichtbar."
        : "Verfolge das Brett. Relevante Nebeninfos liegen im Drawer."),
    players,
    selfPlayer,
    tradeRatios: bestTradeRatioByResource(snapshot.board, match.playerId),
  };
}

export function isBoardAction(action: MatchCommandType | undefined): action is MatchCommandType {
  return !!action && BOARD_ACTIONS.has(action);
}

export function sumResources(resources: ResourceCounts): number {
  return resources.wood + resources.brick + resources.sheep + resources.wheat + resources.ore;
}

export { actionLabel, developmentCardEntries };
