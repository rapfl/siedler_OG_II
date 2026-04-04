import type {
  DevelopmentCardCounts,
  DevelopmentCardResolution,
  MatchActionContext,
  MatchCommandType,
  MatchPlayerSummaryView,
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
  const legalSetupPlacements = deriveLegalSetupPlacements(match, viewerPlayerId);
  const legalRoadEdgeIds = deriveLegalRoadEdgeIds(match, viewerPlayerId, legalSetupPlacements);
  const legalSettlementIntersectionIds = deriveLegalSettlementIntersectionIds(match, viewerPlayerId, legalSetupPlacements);
  const legalCityIntersectionIds = deriveLegalCityIntersectionIds(match, viewerPlayerId);
  const legalRobberHexIds = deriveLegalRobberHexIds(match, viewerPlayerId);

  return {
    matchId: match.matchId,
    matchStatus: match.status,
    matchVersion: match.version,
    playerId: viewerPlayerId,
    playerOrder: match.playerOrder,
    allowedActions,
    requiredAction,
    actionContext: deriveActionContext(match, viewerPlayerId, discardRequiredCount),
    setupStep: match.setup?.step,
    currentSetupPlayerId: match.setup?.currentPlayerId,
    legalSetupPlacements,
    legalRoadEdgeIds,
    legalSettlementIntersectionIds,
    legalCityIntersectionIds,
    legalRobberHexIds,
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
    players: projectPlayers(match, viewerPlayerId, visiblePoints),
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

function deriveLegalRoadEdgeIds(
  match: MatchState,
  viewerPlayerId: string,
  legalSetupPlacements: string[] | undefined,
): string[] | undefined {
  if (match.status === "match_setup" && deriveSetupRequiredAction(match, viewerPlayerId) === "PLACE_INITIAL_ROAD") {
    return legalSetupPlacements;
  }

  if (match.status !== "match_in_progress") {
    return undefined;
  }

  if (
    match.turn?.phase === "devcard_resolution" &&
    (match.turn.developmentCardResolution === "road_building_place_1" ||
      match.turn.developmentCardResolution === "road_building_place_2")
  ) {
    return Object.keys(match.board?.edges ?? {}).filter((edgeId) =>
      isLegal(() => buildRoad(match, viewerPlayerId, edgeId, { now: PROJECTION_NOW })),
    );
  }

  if (!match.turn || match.turn.activePlayerId !== viewerPlayerId) {
    return undefined;
  }

  if (!["action_phase", "devcard_resolution"].includes(match.turn.phase)) {
    return undefined;
  }

  return Object.keys(match.board?.edges ?? {}).filter((edgeId) =>
    isLegal(() => buildRoad(match, viewerPlayerId, edgeId, { now: PROJECTION_NOW })),
  );
}

function deriveLegalSettlementIntersectionIds(
  match: MatchState,
  viewerPlayerId: string,
  legalSetupPlacements: string[] | undefined,
): string[] | undefined {
  if (match.status === "match_setup" && deriveSetupRequiredAction(match, viewerPlayerId) === "PLACE_INITIAL_SETTLEMENT") {
    return legalSetupPlacements;
  }

  if (match.status !== "match_in_progress" || match.turn?.activePlayerId !== viewerPlayerId || match.turn.phase !== "action_phase") {
    return undefined;
  }

  return Object.keys(match.board?.intersections ?? {}).filter((intersectionId) =>
    isLegal(() => buildSettlement(match, viewerPlayerId, intersectionId, { now: PROJECTION_NOW })),
  );
}

function deriveLegalCityIntersectionIds(match: MatchState, viewerPlayerId: string): string[] | undefined {
  if (match.status !== "match_in_progress" || match.turn?.activePlayerId !== viewerPlayerId || match.turn.phase !== "action_phase") {
    return undefined;
  }

  return Object.keys(match.board?.intersections ?? {}).filter((intersectionId) =>
    isLegal(() => upgradeCity(match, viewerPlayerId, intersectionId, { now: PROJECTION_NOW })),
  );
}

function deriveLegalRobberHexIds(match: MatchState, viewerPlayerId: string): string[] | undefined {
  if (
    match.status !== "match_in_progress" ||
    match.turn?.phase !== "robber_pending" ||
    match.turn.activePlayerId !== viewerPlayerId
  ) {
    return undefined;
  }

  return Object.keys(match.board?.hexes ?? {}).filter((hexId) => hexId !== match.board?.robberHexId);
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

function deriveActionContext(
  match: MatchState,
  viewerPlayerId: string,
  discardRequiredCount: number | undefined,
): MatchActionContext | undefined {
  const requiredAction = deriveRequiredAction(match, viewerPlayerId);
  const isOwnTurn = match.turn?.activePlayerId === viewerPlayerId || match.setup?.currentPlayerId === viewerPlayerId;

  if (!requiredAction) {
    if (match.status === "match_finished") {
      return {
        title: "Match beendet",
        description: "Das Spiel ist entschieden. Postgame und Zusammenfassung bleiben sichtbar.",
        tone: "success",
      };
    }

    if (match.status === "match_setup") {
      return {
        title: isOwnTurn ? "Warte auf deinen Setup-Zug" : "Setup laeuft",
        description: "Die Reihenfolge folgt der Snake-Order. Sobald du dran bist, werden legale Felder hervorgehoben.",
        tone: "neutral",
      };
    }

    return {
      title: isOwnTurn ? "Du bist am Zug" : "Gegner am Zug",
      description: isOwnTurn
        ? "Waehle eine Aktion in der rechten Leiste oder direkt auf dem Brett."
        : "Beobachte Brett, Handel und Event-Log, bis du reagieren kannst.",
      tone: isOwnTurn ? "primary" : "neutral",
    };
  }

  switch (requiredAction) {
    case "PLACE_INITIAL_SETTLEMENT":
      return {
        title: "Start-Siedlung setzen",
        description: "Waehle direkt auf dem Brett eine legale Kreuzung fuer deine Siedlung.",
        tone: "primary",
      };
    case "PLACE_INITIAL_ROAD":
      return {
        title: "Start-Strasse setzen",
        description: "Waehle eine Kante, die an deine soeben platzierte Siedlung grenzt.",
        tone: "primary",
      };
    case "ROLL_DICE":
      return {
        title: "Wuerfeln",
        description: "Ohne Wurf startet keine Produktion und kein normaler Zug.",
        tone: "primary",
      };
    case "DISCARD_RESOURCES":
      return {
        title: "Ressourcen abwerfen",
        description: `Lege exakt ${discardRequiredCount ?? 0} Karten ab, bevor der Raeuber weiter aufgeloest wird.`,
        tone: "danger",
      };
    case "MOVE_ROBBER":
      return {
        title: "Raeuber versetzen",
        description: "Waehle ein anderes Hex. Anschliessend folgt gegebenenfalls der Diebstahl.",
        tone: "warning",
      };
    case "STEAL_RESOURCE":
      return {
        title: "Spieler bestehlen",
        description: "Waehle einen legalen Zielspieler neben dem neuen Raeuber-Feld.",
        tone: "warning",
      };
    case "PICK_YEAR_OF_PLENTY_RESOURCE":
      return {
        title: "Year of Plenty",
        description: "Waehle jetzt die naechste Ressource fuer den Karteneffekt.",
        tone: "primary",
      };
    case "PICK_MONOPOLY_RESOURCE_TYPE":
      return {
        title: "Monopoly",
        description: "Bestimme den Ressourcentyp, den du von allen Gegnern einsammeln willst.",
        tone: "primary",
      };
    case "RESPOND_TRADE":
      return {
        title: "Auf Angebot reagieren",
        description: "Nimm den Handel an oder lehne ab. Bis dahin bleibt der Zustand blockiert.",
        tone: "warning",
      };
    case "BUILD_ROAD":
      return {
        title: "Strassenbau abschliessen",
        description: "Road Building verlangt jetzt eine weitere legale Strasse auf dem Brett.",
        tone: "primary",
      };
    default:
      return {
        title: requiredAction.replaceAll("_", " "),
        description: "Diese Aktion hat momentan Vorrang vor allen anderen Zugschritten.",
        tone: "warning",
      };
  }
}

function projectPlayers(
  match: MatchState,
  viewerPlayerId: string,
  visiblePoints: Record<string, number> | undefined,
): MatchPlayerSummaryView[] {
  return match.playerOrder.map((playerId, turnOrder) => {
    const player = match.players?.find((entry) => entry.playerId === playerId);
    const tradeResponse = match.turn?.tradeOffer?.responses[playerId];

    return {
      playerId,
      turnOrder,
      visiblePoints: visiblePoints?.[playerId] ?? 0,
      resourceCardCount: player ? sumResourceCounts(player.resources) : 0,
      developmentCardCount: player ? developmentCardCount(player.developmentCards) : 0,
      playedKnightCount: player?.playedKnightCount ?? 0,
      isActive: match.turn?.activePlayerId === playerId,
      isSelf: playerId === viewerPlayerId,
      tradeResponse,
    };
  });
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

function developmentCardCount(cards: DevelopmentCardCounts | undefined): number {
  if (!cards) {
    return 0;
  }

  return cards.knight + cards.victory_point + cards.year_of_plenty + cards.monopoly + cards.road_building;
}

function isLegal(action: () => unknown): boolean {
  try {
    action();
    return true;
  } catch {
    return false;
  }
}
