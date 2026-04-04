import type {
  DevelopmentCardResolution,
  MatchCommandType,
  MatchState,
  MatchTradeView,
  MatchView,
  ResourceType,
} from "../../../shared-types/src/index.js";

import { getLegalInitialRoadPlacements, getLegalInitialSettlementPlacements, sumResourceCounts } from "./setup-engine.js";
import {
  buildRoad,
  buildSettlement,
  buyDevelopmentCard,
  calculateHiddenPoints,
  calculateTotalPoints,
  calculateVisiblePoints,
  playKnight,
  playMonopoly,
  playRoadBuilding,
  playYearOfPlenty,
  tradeWithBank,
  upgradeCity,
} from "./turn-engine.js";

const PROJECTION_NOW = "1970-01-01T00:00:00.000Z";
const RESOURCE_TYPES: ResourceType[] = ["wood", "brick", "sheep", "wheat", "ore"];

export function projectMatchView(match: MatchState, viewerPlayerId: string): MatchView {
  const viewer = match.players?.find((player) => player.playerId === viewerPlayerId);
  const visiblePoints = match.board ? calculateVisiblePoints(match) : undefined;
  const hiddenPoints = match.players ? calculateHiddenPoints(match) : undefined;
  const totalPoints = match.players && match.board ? calculateTotalPoints(match) : undefined;
  const tradeOffer = projectTradeOffer(match, viewerPlayerId);
  const discardRequiredCount = deriveRequiredDiscardCount(match, viewerPlayerId);
  const allowedActions = deriveAllowedActions(match, viewerPlayerId);
  const requiredAction = deriveRequiredAction(match, viewerPlayerId);

  return {
    matchId: match.matchId,
    matchStatus: match.status,
    matchVersion: match.version,
    playerId: viewerPlayerId,
    playerOrder: match.playerOrder,
    allowedActions,
    requiredAction,
    setupStep: match.setup?.step,
    currentSetupPlayerId: match.setup?.currentPlayerId,
    legalSetupPlacements: deriveLegalSetupPlacements(match, viewerPlayerId),
    activePlayerId: match.turn?.activePlayerId,
    turnPhase: match.turn?.phase,
    lastRoll: match.turn?.lastRoll,
    visiblePointsByPlayerId: visiblePoints,
    totalPointsForPlayer: totalPoints?.[viewerPlayerId],
    ownResources: viewer?.resources,
    ownDevelopmentCards: viewer?.developmentCards,
    ownHiddenPoints: hiddenPoints?.[viewerPlayerId],
    longestRoadHolderPlayerId: match.longestRoadHolderPlayerId,
    longestRoadLength: match.longestRoadLength,
    largestArmyHolderPlayerId: match.largestArmyHolderPlayerId,
    largestArmySize: match.largestArmySize,
    requiredDiscardCount: discardRequiredCount,
    stealablePlayerIds:
      match.turn?.activePlayerId === viewerPlayerId ? match.turn.stealablePlayerIds : undefined,
    tradeOffer,
  };
}

function deriveAllowedActions(match: MatchState, viewerPlayerId: string): MatchCommandType[] {
  if (match.status === "match_setup") {
    return deriveSetupActions(match, viewerPlayerId);
  }

  if (match.status !== "match_in_progress" || !match.turn) {
    return [];
  }

  const turn = match.turn;
  if (turn.phase === "turn_start" || turn.phase === "resolving_roll" || turn.phase === "turn_end_pending") {
    return [];
  }

  if (turn.phase === "discard_pending") {
    return isPendingDiscardPlayer(match, viewerPlayerId) ? ["DISCARD_RESOURCES"] : [];
  }

  if (turn.phase === "robber_pending") {
    if (turn.activePlayerId !== viewerPlayerId) {
      return [];
    }

    return turn.stealablePlayerIds?.length ? ["STEAL_RESOURCE"] : ["MOVE_ROBBER"];
  }

  if (turn.phase === "devcard_resolution") {
    return turn.activePlayerId === viewerPlayerId ? [deriveRequiredDevcardResolutionAction(turn.developmentCardResolution)] : [];
  }

  if (turn.activePlayerId !== viewerPlayerId) {
    return turn.phase === "action_phase" && canRespondToTrade(match, viewerPlayerId) ? ["RESPOND_TRADE"] : [];
  }

  if (turn.phase === "roll_pending") {
    return ["ROLL_DICE"];
  }

  const actions: MatchCommandType[] = [];

  if (turn.phase === "pre_roll_devcard_window") {
    actions.push("ROLL_DICE");
    pushDevelopmentCardActions(actions, match, viewerPlayerId);
    return actions;
  }

  if (turn.phase !== "action_phase") {
    return [];
  }

  if (hasLegalRoadBuild(match, viewerPlayerId)) {
    actions.push("BUILD_ROAD");
  }
  if (hasLegalSettlementBuild(match, viewerPlayerId)) {
    actions.push("BUILD_SETTLEMENT");
  }
  if (hasLegalCityUpgrade(match, viewerPlayerId)) {
    actions.push("UPGRADE_CITY");
  }
  if (canOfferTrade(match, viewerPlayerId)) {
    actions.push("OFFER_TRADE");
  }
  if (canTradeWithBank(match, viewerPlayerId)) {
    actions.push("TRADE_WITH_BANK");
  }
  if (canBuyDevelopmentCard(match, viewerPlayerId)) {
    actions.push("BUY_DEV_CARD");
  }
  pushDevelopmentCardActions(actions, match, viewerPlayerId);
  if (canConfirmTrade(match, viewerPlayerId)) {
    actions.push("CONFIRM_TRADE");
  }
  if (canCancelTrade(match, viewerPlayerId)) {
    actions.push("CANCEL_TRADE");
  }
  actions.push("END_TURN");

  return actions;
}

function deriveRequiredAction(match: MatchState, viewerPlayerId: string): MatchCommandType | undefined {
  if (match.status === "match_setup") {
    return deriveSetupRequiredAction(match, viewerPlayerId);
  }

  if (match.status !== "match_in_progress" || !match.turn) {
    return undefined;
  }

  const turn = match.turn;

  if (turn.phase === "discard_pending" && isPendingDiscardPlayer(match, viewerPlayerId)) {
    return "DISCARD_RESOURCES";
  }

  if (turn.phase === "robber_pending" && turn.activePlayerId === viewerPlayerId) {
    return turn.stealablePlayerIds?.length ? "STEAL_RESOURCE" : "MOVE_ROBBER";
  }

  if (turn.phase === "devcard_resolution" && turn.activePlayerId === viewerPlayerId) {
    return deriveRequiredDevcardResolutionAction(turn.developmentCardResolution);
  }

  if (turn.phase === "roll_pending" && turn.activePlayerId === viewerPlayerId) {
    return "ROLL_DICE";
  }

  if (turn.phase === "action_phase" && turn.activePlayerId !== viewerPlayerId && canRespondToTrade(match, viewerPlayerId)) {
    return "RESPOND_TRADE";
  }

  return undefined;
}

function deriveLegalSetupPlacements(match: MatchState, viewerPlayerId: string): string[] | undefined {
  if (match.status !== "match_setup" || match.setup?.currentPlayerId !== viewerPlayerId) {
    return undefined;
  }

  if (match.setup.step === "setup_forward_settlement" || match.setup.step === "setup_reverse_settlement") {
    return getLegalInitialSettlementPlacements(match, viewerPlayerId);
  }

  if (match.setup.step === "setup_forward_road" || match.setup.step === "setup_reverse_road") {
    return getLegalInitialRoadPlacements(match, viewerPlayerId);
  }

  return undefined;
}

function deriveSetupActions(match: MatchState, viewerPlayerId: string): MatchCommandType[] {
  const requiredAction = deriveSetupRequiredAction(match, viewerPlayerId);
  return requiredAction ? [requiredAction] : [];
}

function deriveSetupRequiredAction(match: MatchState, viewerPlayerId: string): MatchCommandType | undefined {
  if (match.status !== "match_setup" || match.setup?.currentPlayerId !== viewerPlayerId) {
    return undefined;
  }

  if (match.setup.step === "setup_forward_settlement" || match.setup.step === "setup_reverse_settlement") {
    return "PLACE_INITIAL_SETTLEMENT";
  }

  if (match.setup.step === "setup_forward_road" || match.setup.step === "setup_reverse_road") {
    return "PLACE_INITIAL_ROAD";
  }

  return undefined;
}

function deriveRequiredDiscardCount(match: MatchState, viewerPlayerId: string): number | undefined {
  if (!isPendingDiscardPlayer(match, viewerPlayerId)) {
    return undefined;
  }

  const viewer = match.players?.find((player) => player.playerId === viewerPlayerId);
  return viewer ? Math.floor(sumResourceCounts(viewer.resources) / 2) : undefined;
}

function projectTradeOffer(match: MatchState, viewerPlayerId: string): MatchTradeView | undefined {
  const tradeOffer = match.turn?.tradeOffer;
  if (!tradeOffer) {
    return undefined;
  }

  return {
    tradeId: tradeOffer.tradeId,
    offeredByPlayerId: tradeOffer.offeredByPlayerId,
    offeredResources: tradeOffer.offeredResources,
    requestedResources: tradeOffer.requestedResources,
    acceptedPlayerIds: Object.entries(tradeOffer.responses)
      .filter(([, response]) => response === "accept")
      .map(([playerId]) => playerId)
      .sort(),
    rejectedPlayerIds: Object.entries(tradeOffer.responses)
      .filter(([, response]) => response === "reject")
      .map(([playerId]) => playerId)
      .sort(),
    selfResponse: tradeOffer.responses[viewerPlayerId],
  };
}

function isPendingDiscardPlayer(match: MatchState, viewerPlayerId: string): boolean {
  return (
    match.turn?.phase === "discard_pending" &&
    !!match.turn.discardPlayerIds?.includes(viewerPlayerId) &&
    !match.turn.discardResolvedPlayerIds?.includes(viewerPlayerId)
  );
}

function deriveRequiredDevcardResolutionAction(resolution: DevelopmentCardResolution | undefined): MatchCommandType {
  switch (resolution) {
    case "year_of_plenty_pick_1":
    case "year_of_plenty_pick_2":
      return "PICK_YEAR_OF_PLENTY_RESOURCE";
    case "monopoly_pick_resource":
      return "PICK_MONOPOLY_RESOURCE_TYPE";
    case "road_building_place_1":
    case "road_building_place_2":
      return "BUILD_ROAD";
    default:
      throw new Error(`Unknown development card resolution: ${resolution ?? "undefined"}`);
  }
}

function pushDevelopmentCardActions(actions: MatchCommandType[], match: MatchState, viewerPlayerId: string): void {
  if (canPlayKnight(match, viewerPlayerId)) {
    actions.push("PLAY_DEV_CARD_KNIGHT");
  }
  if (canPlayYearOfPlenty(match, viewerPlayerId)) {
    actions.push("PLAY_DEV_CARD_YEAR_OF_PLENTY");
  }
  if (canPlayMonopoly(match, viewerPlayerId)) {
    actions.push("PLAY_DEV_CARD_MONOPOLY");
  }
  if (canPlayRoadBuilding(match, viewerPlayerId)) {
    actions.push("PLAY_DEV_CARD_ROAD_BUILDING");
  }
}

function hasLegalRoadBuild(match: MatchState, viewerPlayerId: string): boolean {
  return Object.keys(match.board?.edges ?? {}).some((edgeId) =>
    isLegal(() => buildRoad(match, viewerPlayerId, edgeId, { now: PROJECTION_NOW })),
  );
}

function hasLegalSettlementBuild(match: MatchState, viewerPlayerId: string): boolean {
  return Object.keys(match.board?.intersections ?? {}).some((intersectionId) =>
    isLegal(() => buildSettlement(match, viewerPlayerId, intersectionId, { now: PROJECTION_NOW })),
  );
}

function hasLegalCityUpgrade(match: MatchState, viewerPlayerId: string): boolean {
  return Object.keys(match.board?.intersections ?? {}).some((intersectionId) =>
    isLegal(() => upgradeCity(match, viewerPlayerId, intersectionId, { now: PROJECTION_NOW })),
  );
}

function canBuyDevelopmentCard(match: MatchState, viewerPlayerId: string): boolean {
  return isLegal(() => buyDevelopmentCard(match, viewerPlayerId));
}

function canPlayKnight(match: MatchState, viewerPlayerId: string): boolean {
  return isLegal(() => playKnight(match, viewerPlayerId, { now: PROJECTION_NOW }));
}

function canPlayYearOfPlenty(match: MatchState, viewerPlayerId: string): boolean {
  return isLegal(() => playYearOfPlenty(match, viewerPlayerId));
}

function canPlayMonopoly(match: MatchState, viewerPlayerId: string): boolean {
  return isLegal(() => playMonopoly(match, viewerPlayerId));
}

function canPlayRoadBuilding(match: MatchState, viewerPlayerId: string): boolean {
  return isLegal(() => playRoadBuilding(match, viewerPlayerId));
}

function canOfferTrade(match: MatchState, viewerPlayerId: string): boolean {
  if (match.turn?.activePlayerId !== viewerPlayerId || match.turn.phase !== "action_phase" || match.turn.tradeOffer) {
    return false;
  }

  const viewer = match.players?.find((player) => player.playerId === viewerPlayerId);
  return (viewer ? sumResourceCounts(viewer.resources) : 0) > 0 && match.playerOrder.some((playerId) => playerId !== viewerPlayerId);
}

function canRespondToTrade(match: MatchState, viewerPlayerId: string): boolean {
  const tradeOffer = match.turn?.tradeOffer;
  return (
    match.turn?.phase === "action_phase" &&
    !!tradeOffer &&
    match.turn.activePlayerId !== viewerPlayerId &&
    tradeOffer.responses[viewerPlayerId] === undefined
  );
}

function canConfirmTrade(match: MatchState, viewerPlayerId: string): boolean {
  const tradeOffer = match.turn?.tradeOffer;
  return (
    match.turn?.phase === "action_phase" &&
    match.turn.activePlayerId === viewerPlayerId &&
    !!tradeOffer &&
    Object.values(tradeOffer.responses).includes("accept")
  );
}

function canCancelTrade(match: MatchState, viewerPlayerId: string): boolean {
  return (
    match.turn?.phase === "action_phase" &&
    match.turn.activePlayerId === viewerPlayerId &&
    match.turn.tradeOffer?.offeredByPlayerId === viewerPlayerId
  );
}

function canTradeWithBank(match: MatchState, viewerPlayerId: string): boolean {
  const viewer = match.players?.find((player) => player.playerId === viewerPlayerId);
  if (!viewer) {
    return false;
  }

  for (const giveType of RESOURCE_TYPES) {
    for (const receiveType of RESOURCE_TYPES) {
      if (giveType === receiveType) {
        continue;
      }

      for (const ratio of [2, 3, 4] as const) {
        if (viewer.resources[giveType] < ratio) {
          continue;
        }

        if (
          isLegal(() =>
            tradeWithBank(match, viewerPlayerId, {
              giveResources: { [giveType]: ratio },
              receiveResources: { [receiveType]: 1 },
            }),
          )
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

function isLegal(action: () => unknown): boolean {
  try {
    action();
    return true;
  } catch {
    return false;
  }
}
