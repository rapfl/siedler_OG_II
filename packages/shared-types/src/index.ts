export type PlayerCount = 3 | 4;

export type PlayerColor = "red" | "blue" | "white" | "orange";

export type RoomStatus =
  | "room_open_prematch"
  | "room_match_starting"
  | "room_match_in_progress"
  | "room_postgame"
  | "room_closed";

export type MatchStatus =
  | "match_initializing"
  | "match_setup"
  | "match_in_progress"
  | "match_finished"
  | "match_aborted";

export type PresenceStatus = "connected" | "disconnected_grace" | "expired" | "explicitly_left";

export type RoomStartBlocker = "ROOM_NOT_OPEN" | "MIN_PLAYERS" | "UNREADY_PLAYERS";

export type ResumeContext =
  | "resume_room_only"
  | "resume_room_and_match"
  | "resume_postgame"
  | "resume_denied_session_invalid"
  | "resume_denied_seat_expired"
  | "resume_denied_explicit_leave"
  | "session_conflict";

export type ResourceType = "wood" | "brick" | "sheep" | "wheat" | "ore";

export type TerrainType = ResourceType | "desert";

export type HarborType =
  | "generic_3_to_1"
  | "wood_2_to_1"
  | "brick_2_to_1"
  | "sheep_2_to_1"
  | "wheat_2_to_1"
  | "ore_2_to_1";

export type BuildingType = "settlement" | "city";

export type DevelopmentCardType =
  | "knight"
  | "victory_point"
  | "year_of_plenty"
  | "monopoly"
  | "road_building";

export type DevelopmentCardResolution =
  | "year_of_plenty_pick_1"
  | "year_of_plenty_pick_2"
  | "monopoly_pick_resource"
  | "road_building_place_1"
  | "road_building_place_2";

export type TradeResponse = "accept" | "reject";

export type SetupStep =
  | "setup_forward_settlement"
  | "setup_forward_road"
  | "setup_reverse_settlement"
  | "setup_reverse_road"
  | "setup_complete";

export type TurnPhase =
  | "turn_start"
  | "pre_roll_devcard_window"
  | "roll_pending"
  | "resolving_roll"
  | "discard_pending"
  | "robber_pending"
  | "action_phase"
  | "devcard_resolution"
  | "turn_end_pending";

export interface PlayerIdentity {
  playerId: string;
  displayName: string;
  sessionId: string;
}

export interface RoomPlayer extends PlayerIdentity {
  seatIndex: number;
  color: PlayerColor;
  ready: boolean;
  presence: PresenceStatus;
  joinedAt: string;
  disconnectedAt?: string | undefined;
  graceUntil?: string | undefined;
  explicitlyLeftAt?: string | undefined;
}

export interface MatchPostgameSummary {
  matchId: string;
  finishedAt: string;
  winnerPlayerId: string;
  winningTotalPoints: number;
  victoryCause: "score_threshold" | "turn_start_victory";
}

export interface RoomState {
  roomId: string;
  roomCode: string;
  hostPlayerId: string;
  maxPlayers: PlayerCount;
  status: RoomStatus;
  players: RoomPlayer[];
  currentMatchId?: string | undefined;
  lastCompletedMatchId?: string | undefined;
  postgameSummary?: MatchPostgameSummary | undefined;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface MatchState {
  matchId: string;
  roomId: string;
  status: MatchStatus;
  seed: string;
  playerOrder: string[];
  createdAt: string;
  startedAt?: string | undefined;
  finishedAt?: string | undefined;
  winnerPlayerId?: string | undefined;
  victoryCause?: MatchPostgameSummary["victoryCause"] | undefined;
  board?: GeneratedBoard | undefined;
  players?: MatchPlayerState[] | undefined;
  setup?: SetupState | undefined;
  turn?: TurnState | undefined;
  rngState?: number | undefined;
  developmentDeck?: DevelopmentCardType[] | undefined;
  longestRoadHolderPlayerId?: string | undefined;
  longestRoadLength?: number | undefined;
  largestArmyHolderPlayerId?: string | undefined;
  largestArmySize?: number | undefined;
  version: number;
}

export interface ResourceCounts {
  wood: number;
  brick: number;
  sheep: number;
  wheat: number;
  ore: number;
}

export interface BoardUiPoint {
  x: number;
  y: number;
}

export interface BuildingState {
  ownerPlayerId: string;
  buildingType: BuildingType;
}

export interface RoadState {
  ownerPlayerId: string;
}

export interface BoardHex {
  hexId: string;
  axialCoord: {
    q: number;
    r: number;
  };
  uiCenter: BoardUiPoint;
  resourceType: TerrainType;
  tokenNumber?: number | undefined;
  isDesert: boolean;
  hasRobber: boolean;
  adjacentIntersectionIds: string[];
  adjacentEdgeIds: string[];
  adjacentHexIds: string[];
}

export interface BoardIntersection {
  intersectionId: string;
  uiPosition: BoardUiPoint;
  adjacentHexIds: string[];
  adjacentEdgeIds: string[];
  adjacentIntersectionIds: string[];
  building?: BuildingState | undefined;
  harborAccess?: HarborType | undefined;
}

export interface BoardEdge {
  edgeId: string;
  uiMidpoint: BoardUiPoint;
  intersectionAId: string;
  intersectionBId: string;
  adjacentHexIds: string[];
  road?: RoadState | undefined;
}

export interface BoardHarbor {
  harborId: string;
  harborType: HarborType;
  intersectionIds: [string, string];
}

export interface GeneratedBoard {
  hexOrder: string[];
  hexes: Record<string, BoardHex>;
  intersections: Record<string, BoardIntersection>;
  edges: Record<string, BoardEdge>;
  harbors: Record<string, BoardHarbor>;
  robberHexId: string;
}

export interface MatchPlayerState {
  playerId: string;
  resources: ResourceCounts;
  initialSettlementIntersectionIds: string[];
  initialRoadEdgeIds: string[];
  developmentCards?: DevelopmentCardCounts | undefined;
  playedKnightCount?: number | undefined;
}

export interface DevelopmentCardCounts {
  knight: number;
  victory_point: number;
  year_of_plenty: number;
  monopoly: number;
  road_building: number;
}

export interface TradeOfferState {
  tradeId: string;
  offeredByPlayerId: string;
  offeredResources: ResourceCounts;
  requestedResources: ResourceCounts;
  responses: Record<string, TradeResponse>;
}

export interface SetupState {
  step: SetupStep;
  currentPlayerId: string;
  currentRound: 1 | 2;
  currentIndex: number;
  placementOrder: string[];
  pendingSettlementIntersectionId?: string | undefined;
}

export interface TurnState {
  activePlayerId: string;
  phase: TurnPhase;
  turnNumber: number;
  lastRoll?: number | undefined;
  hasPlayedDevCardThisTurn?: boolean | undefined;
  purchasedDevelopmentCardsThisTurn?: DevelopmentCardCounts | undefined;
  developmentCardResolution?: DevelopmentCardResolution | undefined;
  pendingYearOfPlentyResources?: ResourceType[] | undefined;
  tradeOffer?: TradeOfferState | undefined;
  discardPlayerIds?: string[] | undefined;
  discardResolvedPlayerIds?: string[] | undefined;
  stealablePlayerIds?: string[] | undefined;
  pendingRobberReason?: "rolled_seven" | "played_knight" | undefined;
  pendingRobberReturnPhase?: "roll_pending" | "action_phase" | undefined;
}

export interface RoomPlayerSummary {
  playerId: string;
  displayName: string;
  seatIndex: number;
  color: PlayerColor;
  ready: boolean;
  presence: PresenceStatus;
  isHost: boolean;
}

export interface RoomSeatState {
  seatIndex: number;
  occupantPlayerId?: string | undefined;
  occupantDisplayName?: string | undefined;
  color?: PlayerColor | undefined;
  ready: boolean;
  presence: PresenceStatus | "empty";
  isHost: boolean;
}

export interface RoomView {
  roomId: string;
  roomCode: string;
  invitePath: string;
  roomStatus: RoomStatus;
  roomVersion: number;
  maxPlayers: PlayerCount;
  hostPlayerId: string;
  selfPlayerId?: string | undefined;
  currentMatchId?: string | undefined;
  playerSummaries: RoomPlayerSummary[];
  seatStates: RoomSeatState[];
  canStartMatch: boolean;
  startBlockers: RoomStartBlocker[];
  postgameSummary?: MatchPostgameSummary | undefined;
}

export interface MatchPlayerSummaryView {
  playerId: string;
  turnOrder: number;
  visiblePoints: number;
  resourceCardCount: number;
  developmentCardCount: number;
  playedKnightCount: number;
  isActive: boolean;
  isSelf: boolean;
  tradeResponse?: TradeResponse | undefined;
}

export interface MatchActionContext {
  title: string;
  description: string;
  tone: "primary" | "warning" | "danger" | "success" | "neutral";
}

export interface MatchView {
  matchId: string;
  matchStatus: MatchStatus;
  matchVersion: number;
  playerId: string;
  playerOrder: string[];
  allowedActions?: MatchCommandType[] | undefined;
  requiredAction?: MatchCommandType | undefined;
  actionContext?: MatchActionContext | undefined;
  setupStep?: SetupStep | undefined;
  currentSetupPlayerId?: string | undefined;
  legalSetupPlacements?: string[] | undefined;
  legalRoadEdgeIds?: string[] | undefined;
  legalSettlementIntersectionIds?: string[] | undefined;
  legalCityIntersectionIds?: string[] | undefined;
  legalRobberHexIds?: string[] | undefined;
  activePlayerId?: string | undefined;
  turnPhase?: TurnPhase | undefined;
  lastRoll?: number | undefined;
  visiblePointsByPlayerId?: Record<string, number> | undefined;
  totalPointsForPlayer?: number | undefined;
  ownResources?: ResourceCounts | undefined;
  ownDevelopmentCards?: DevelopmentCardCounts | undefined;
  ownHiddenPoints?: number | undefined;
  longestRoadHolderPlayerId?: string | undefined;
  longestRoadLength?: number | undefined;
  largestArmyHolderPlayerId?: string | undefined;
  largestArmySize?: number | undefined;
  requiredDiscardCount?: number | undefined;
  stealablePlayerIds?: string[] | undefined;
  tradeOffer?: MatchTradeView | undefined;
  players: MatchPlayerSummaryView[];
}

export interface MatchTradeView {
  tradeId: string;
  offeredByPlayerId: string;
  offeredResources: ResourceCounts;
  requestedResources: ResourceCounts;
  acceptedPlayerIds: string[];
  rejectedPlayerIds: string[];
  selfResponse?: TradeResponse | undefined;
}

export interface PlayerView {
  playerId?: string | undefined;
  room: RoomView;
  match?: MatchView | undefined;
}

export interface ClientConnectSessionMessage {
  type: "client.connect_session";
  sessionId: string;
  roomId?: string | undefined;
  matchId?: string | undefined;
  lastKnownRoomVersion?: number | undefined;
  lastKnownMatchVersion?: number | undefined;
  lastKnownPlayerId?: string | undefined;
}

export interface ClientSubscribeRoomMessage {
  type: "client.subscribe_room";
  roomId: string;
}

export interface ClientSubscribeMatchMessage {
  type: "client.subscribe_match";
  matchId: string;
}

export type MatchCommandType =
  | "PLACE_INITIAL_SETTLEMENT"
  | "PLACE_INITIAL_ROAD"
  | "ROLL_DICE"
  | "END_TURN"
  | "BUILD_ROAD"
  | "BUILD_SETTLEMENT"
  | "UPGRADE_CITY"
  | "DISCARD_RESOURCES"
  | "MOVE_ROBBER"
  | "STEAL_RESOURCE"
  | "BUY_DEV_CARD"
  | "PLAY_DEV_CARD_KNIGHT"
  | "PLAY_DEV_CARD_YEAR_OF_PLENTY"
  | "PICK_YEAR_OF_PLENTY_RESOURCE"
  | "PLAY_DEV_CARD_MONOPOLY"
  | "PICK_MONOPOLY_RESOURCE_TYPE"
  | "PLAY_DEV_CARD_ROAD_BUILDING"
  | "OFFER_TRADE"
  | "RESPOND_TRADE"
  | "CONFIRM_TRADE"
  | "CANCEL_TRADE"
  | "TRADE_WITH_BANK";

export interface ClientSubmitCommandMessage {
  type: "client.submit_command";
  commandId: string;
  roomId: string;
  matchId?: string | undefined;
  commandType: MatchCommandType;
  payload?: Record<string, unknown> | undefined;
  clientStateVersion?: number | undefined;
}

export interface SessionAttachedMessage {
  type: "server.session_attached";
  sessionId: string;
  playerId: string | null;
  resumeContext: ResumeContext;
}

export interface RoomSnapshotMessage {
  type: "server.room_snapshot";
  sessionId: string;
  room: RoomView;
}

export interface RoomUpdatedMessage {
  type: "server.room_updated";
  sessionId: string;
  room: RoomView;
}

export interface MatchSnapshotMessage {
  type: "server.match_snapshot";
  sessionId: string;
  roomId: string;
  matchId: string;
  matchVersion: number;
  playerView: MatchView;
}

export interface LifecycleTransitionMessage {
  type: "server.lifecycle_transition";
  roomId: string;
  context: "room" | "match";
  fromState: RoomStatus | MatchStatus;
  toState: RoomStatus | MatchStatus;
  matchId?: string | undefined;
}

export interface PresenceUpdatedMessage {
  type: "server.presence_updated";
  roomId: string;
  playerId: string;
  presence: PresenceStatus;
  graceUntil?: string | undefined;
}

export interface CommandAcceptedMessage {
  type: "server.command_accepted";
  sessionId: string;
  commandId: string;
  acceptedAtVersion: number;
  effectsSummary?: string | undefined;
}

export interface CommandRejectedMessage {
  type: "server.command_rejected";
  sessionId: string;
  commandId: string;
  reasonCode: string;
  message: string;
  currentRelevantVersion?: number | undefined;
}

export type ServerMessage =
  | SessionAttachedMessage
  | RoomSnapshotMessage
  | RoomUpdatedMessage
  | MatchSnapshotMessage
  | LifecycleTransitionMessage
  | PresenceUpdatedMessage
  | CommandAcceptedMessage
  | CommandRejectedMessage;
