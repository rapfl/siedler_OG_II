"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ClientErrorBoundary } from "../../components/client-error-boundary";
import { GameBoard } from "../../components/game-board";
import { AppShell } from "../../components/shell";
import { AssetToken } from "../../lib/assets/manifest";
import { useRealtimeSnapshot } from "../../lib/realtime/use-realtime";
import { requiredActionPanel, requiredActionSurface, type MatchUtilityPanel } from "../../lib/ui/match-required-action";
import { createMatchScreenModel, developmentCardEntries, isBoardAction, sumResources } from "../../lib/ui/match-screen-model";
import {
  canIncrementResourceSelection,
  clampResourceSelection,
  nextResourceSelection,
  type ResourceEditorConstraints,
} from "../../lib/ui/resource-editor-state";
import { playerColorToken, resourceEntries, resourceLabel, summarizeLogEntry } from "../../lib/ui/view-model";
import { useRouteBodyClass } from "../../lib/ui/use-route-body-class";
import type { MatchCommandType, MatchView, ResourceCounts, ResourceType } from "@siedler/shared-types";

type BuildMode = "ROAD" | "SETTLEMENT" | "CITY" | null;

const RESOURCE_TYPES: ResourceType[] = ["wood", "brick", "sheep", "wheat", "ore"];

function randomCommandId(): string {
  return `ui-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyResources(): ResourceCounts {
  return {
    wood: 0,
    brick: 0,
    sheep: 0,
    wheat: 0,
    ore: 0,
  };
}

async function submit(
  client: ReturnType<typeof useRealtimeSnapshot>["client"],
  match: MatchView,
  commandType: MatchCommandType,
  payload: Record<string, unknown>,
) {
  return client.submitCommand({
    commandId: randomCommandId(),
    matchId: match.matchId,
    commandType,
    payload,
    clientStateVersion: match.matchVersion,
  });
}

export function MatchScreen({ matchId }: { matchId: string }) {
  useRouteBodyClass("route-match");

  const { client, session, snapshot } = useRealtimeSnapshot();
  const [selectedBoardAction, setSelectedBoardAction] = useState<MatchCommandType>();
  const [activeUtility, setActiveUtility] = useState<MatchUtilityPanel>(null);
  const [buildMode, setBuildMode] = useState<BuildMode>(null);
  const [tradeGive, setTradeGive] = useState<ResourceCounts>(emptyResources());
  const [tradeWant, setTradeWant] = useState<ResourceCounts>(emptyResources());
  const [bankGive, setBankGive] = useState<ResourceCounts>(emptyResources());
  const [bankWant, setBankWant] = useState<ResourceCounts>(emptyResources());
  const [discardResources, setDiscardResources] = useState<ResourceCounts>(emptyResources());
  const [hoverTarget, setHoverTarget] = useState<string>();

  const model = createMatchScreenModel(snapshot, matchId, selectedBoardAction);
  const match = snapshot.match?.matchId === matchId ? snapshot.match : undefined;
  const room = snapshot.room;
  const board = snapshot.board;
  const sandboxIdentities = client.supportsSandboxTools() ? client.getSandboxIdentities() : [];

  useEffect(() => {
    if (!match) {
      return;
    }

    if (isBoardAction(model?.requiredAction)) {
      setSelectedBoardAction(undefined);
      setBuildMode(null);
      return;
    }

    setSelectedBoardAction((current) => {
      if (!current) {
        return current;
      }
      if (!match.allowedActions?.includes(current)) {
        return undefined;
      }
      return current;
    });
  }, [match?.matchId, match?.matchVersion, match?.allowedActions, model?.requiredAction, match]);

  useEffect(() => {
    const forcedPanel = requiredActionPanel(model?.requiredAction);
    if (forcedPanel !== null) {
      setActiveUtility(forcedPanel);
      return;
    }

    const forcedSurface = requiredActionSurface(model?.requiredAction);
    if ((forcedSurface === "board" || forcedSurface === "inline") && activeUtility !== null) {
      setActiveUtility(null);
    }
  }, [activeUtility, model?.requiredAction]);

  useEffect(() => {
    if (!match || model?.requiredAction !== "DISCARD_RESOURCES") {
      setDiscardResources(emptyResources());
      return;
    }

    setDiscardResources((current) =>
      clampResourceSelection(current, {
        maxByResource: match.ownResources ?? emptyResources(),
        totalCap: match.requiredDiscardCount ?? 0,
      }),
    );
  }, [match, model?.requiredAction, match?.matchVersion, match?.requiredDiscardCount, match?.ownResources]);

  if (!match || !model) {
    return (
      <AppShell title="siedler_OG_II" kicker="Match">
        <div className="empty-state">
          <p className="eyebrow">Match State</p>
          <h1 className="display-title">Kein passender Match-Snapshot.</h1>
          <p>Oeffne ein aktives Match ueber den Room-Kontext oder ueber Resume.</p>
          <div className="cluster">
            <Link href={session?.roomCode ? `/room/${session.roomCode}` : "/"} className="action-button">
              Zurueck zur Lobby
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const discardRemaining = Math.max(0, (match.requiredDiscardCount ?? 0) - sumResources(discardResources));
  const boardMode = isBoardAction(model.requiredAction) ? model.requiredAction : selectedBoardAction;
  const activeTradeId = match.tradeOffer?.tradeId;
  const acceptedCounterpartyPlayerId = match.tradeOffer?.acceptedPlayerIds[0];
  const forcedSurface = requiredActionSurface(model.requiredAction);
  const isSetupPhase = match.matchStatus === "match_setup";
  const boardSelectionHint = describeBoardSelection(boardMode, match);
  const phaseDisplay = phaseDisplayLabel(match);
  const resourceBarEntries = resourceEntries(match.ownResources);
  const recentChronicleEntries = snapshot.eventLog.slice(-4).reverse();
  const canRollDice = match.allowedActions?.includes("ROLL_DICE") ?? false;
  const canBuyDevCard = match.allowedActions?.includes("BUY_DEV_CARD") ?? false;
  const isBuildMenuOpen = boardMode === "BUILD_ROAD" || boardMode === "BUILD_SETTLEMENT" || boardMode === "UPGRADE_CITY" || buildMode !== null;
  const canToggleBuildMenu =
    !!(
      match.allowedActions?.includes("BUILD_ROAD") ||
      match.allowedActions?.includes("BUILD_SETTLEMENT") ||
      match.allowedActions?.includes("UPGRADE_CITY") ||
      model.requiredAction === "PLACE_INITIAL_SETTLEMENT" ||
      model.requiredAction === "PLACE_INITIAL_ROAD"
    ) && forcedSurface !== "trade" && forcedSurface !== "dev" && forcedSurface !== "inline";

  const toggleBuildSelection = (nextMode: BuildMode, nextAction: Extract<MatchCommandType, "BUILD_ROAD" | "BUILD_SETTLEMENT" | "UPGRADE_CITY">) => {
    const shouldClear = buildMode === nextMode && selectedBoardAction === nextAction;
    setBuildMode(shouldClear ? null : nextMode);
    setSelectedBoardAction(shouldClear ? undefined : nextAction);
  };

  const toggleUtilityPanel = (panel: Exclude<MatchUtilityPanel, null>) => {
    if (!isBoardAction(model.requiredAction)) {
      setSelectedBoardAction(undefined);
    }
    setBuildMode(null);
    setActiveUtility((current) => (current === panel ? null : panel));
  };

  const toggleBuildMenu = () => {
    if (isBuildMenuOpen) {
      setBuildMode(null);
      if (!isBoardAction(model.requiredAction)) {
        setSelectedBoardAction(undefined);
      }
      return;
    }

    setActiveUtility(null);
    setBuildMode("ROAD");
    if (!isBoardAction(model.requiredAction)) {
      setSelectedBoardAction("BUILD_ROAD");
    }
  };

  return (
    <AppShell
      title="Settlers of the Realm"
      brandIcon={<ChronicleIcon kind="brand" />}
      pageClassName="shell-page-route"
      contentClassName="shell-content-route"
      actions={
        <div className="realm-header-actions">
          <button
            type="button"
            className={`realm-icon-button ${activeUtility === "tools" ? "realm-icon-button-active" : ""}`}
            aria-label="Werkzeuge anzeigen"
            onClick={() => toggleUtilityPanel("tools")}
          >
            <ChronicleIcon kind="settings" />
          </button>
          <button
            type="button"
            className={`realm-icon-button ${activeUtility === "log" ? "realm-icon-button-active" : ""}`}
            aria-label="Chronik anzeigen"
            onClick={() => toggleUtilityPanel("log")}
          >
            <ChronicleIcon kind="log" />
          </button>
        </div>
      }
    >
      <ClientErrorBoundary
        resetKeys={[match.matchId, match.matchVersion, model.requiredAction, selectedBoardAction, activeUtility, buildMode]}
        fallback={({ reset }) => (
          <div className="match-fallback">
            <p className="eyebrow">Recovery</p>
            <h2 className="section-title">Die Spielansicht muss neu geladen werden.</h2>
            <div className="cluster">
              <button className="action-button secondary-button" onClick={reset}>
                Ansicht neu initialisieren
              </button>
              <button className="action-button" onClick={() => window.location.reload()}>
                Match neu laden
              </button>
            </div>
          </div>
        )}
      >
        <div className="match-surface realm-match-surface">
          <div className="realm-match-layout">
            <section className="realm-board-panel">
              <div className="realm-board-heading">
                <p className="realm-turn-kicker">Current turn: {model.currentActorDisplayName ?? "Unknown player"}</p>
                <h1 className="realm-phase-title">{phaseDisplay}</h1>
              </div>

              {forcedSurface === "inline" ? (
                <ForcedActionStrip
                  match={match}
                  model={model}
                  discardRemaining={discardRemaining}
                  discardResources={discardResources}
                  onDiscardResourcesChange={setDiscardResources}
                  discardConstraints={{
                    maxByResource: match.ownResources ?? emptyResources(),
                    totalCap: match.requiredDiscardCount ?? 0,
                  }}
                  onSubmit={(commandType, payload) => void submit(client, match, commandType, payload)}
                />
              ) : null}

              <div className="realm-board-frame">
                <GameBoard
                  board={board}
                  room={room}
                  match={match}
                  mode={boardMode}
                  onHoverTargetChange={setHoverTarget}
                  onHexSelect={(hexId) => {
                    if (boardMode === "MOVE_ROBBER") {
                      void submit(client, match, "MOVE_ROBBER", { targetHexId: hexId });
                    }
                  }}
                  onIntersectionSelect={(intersectionId) => {
                    if (boardMode === "PLACE_INITIAL_SETTLEMENT") {
                      void submit(client, match, "PLACE_INITIAL_SETTLEMENT", { intersectionId });
                    }
                    if (boardMode === "BUILD_SETTLEMENT") {
                      void submit(client, match, "BUILD_SETTLEMENT", { intersectionId });
                    }
                    if (boardMode === "UPGRADE_CITY") {
                      void submit(client, match, "UPGRADE_CITY", { intersectionId });
                    }
                  }}
                  onEdgeSelect={(edgeId) => {
                    if (boardMode === "PLACE_INITIAL_ROAD") {
                      void submit(client, match, "PLACE_INITIAL_ROAD", { edgeId });
                    }
                    if (boardMode === "BUILD_ROAD") {
                      void submit(client, match, "BUILD_ROAD", { edgeId });
                    }
                  }}
                />

                {!isSetupPhase ? (
                  <BoardDice
                    canRollDice={canRollDice}
                    lastRoll={match.lastRoll}
                    onRollDice={() => void submit(client, match, "ROLL_DICE", {})}
                  />
                ) : null}

                <div className="realm-board-caption">
                  <div>
                    <p className="realm-caption-title">{model.primaryAction}</p>
                    <p className="realm-caption-copy">{boardSelectionHint ?? model.primaryDescription}</p>
                  </div>
                  {hoverTarget ? <span className="realm-caption-badge">Target: {hoverTarget}</span> : null}
                </div>
              </div>
            </section>

            <aside className="realm-sidebar">
              <div className="realm-sidebar-header">
                <h2 className="realm-sidebar-title">The Council</h2>
                <span className="realm-sidebar-mark">
                  <ChronicleIcon kind="council" />
                </span>
              </div>

              <div className="realm-council-list">
                {model.players.map((player) => (
                  <CouncilSeatCard key={player.playerId} player={player} />
                ))}
              </div>

              <MatchSidebarPanel
                activeUtility={activeUtility}
                snapshot={snapshot}
                model={model}
                match={match}
                tradeGive={tradeGive}
                tradeWant={tradeWant}
                bankGive={bankGive}
                bankWant={bankWant}
                setTradeGive={setTradeGive}
                setTradeWant={setTradeWant}
                setBankGive={setBankGive}
                setBankWant={setBankWant}
                activeTradeId={activeTradeId}
                acceptedCounterpartyPlayerId={acceptedCounterpartyPlayerId}
                sandboxIdentities={sandboxIdentities}
                onSubmit={(commandType, payload) => void submit(client, match, commandType, payload)}
                onOpenLog={() => setActiveUtility("log")}
                onOpenTools={() => setActiveUtility("tools")}
                onCloseUtility={() => setActiveUtility(null)}
                onReattach={() => void client.reattachSession()}
                onAdvanceSandbox={client.supportsSandboxTools() ? () => void client.advanceSandbox() : undefined}
                onSwitchSandboxIdentity={(sessionId) => void client.switchSandboxIdentity(sessionId)}
                recentChronicleEntries={recentChronicleEntries}
              />
            </aside>
          </div>

          <section className="realm-dock">
            <div className="realm-dock-hand">
              <div className="realm-resource-hand" aria-label="Your resources">
                {resourceBarEntries.map((resource) => (
                  <div
                    key={resource.type}
                    className={`realm-resource-card realm-resource-card-${resource.type} ${resource.count === 0 ? "realm-resource-card-empty" : ""}`}
                    style={{ "--card-img": `url(/tiles/${resource.type}.png)` } as React.CSSProperties}
                    title={`${resource.label}: ${resource.count}`}
                  >
                    <span className="realm-resource-card-count">{resource.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="realm-dock-actions">
              <DockButton
                label="Build"
                icon="build"
                active={isBuildMenuOpen}
                disabled={!canToggleBuildMenu}
                onClick={toggleBuildMenu}
              />
              <DockButton
                label="Trade"
                icon="trade"
                active={activeUtility === "trade"}
                disabled={forcedSurface === "dev" || forcedSurface === "inline"}
                onClick={() => toggleUtilityPanel("trade")}
              />
              <DockButton
                label="Develop"
                icon="develop"
                active={activeUtility === "dev"}
                disabled={forcedSurface === "trade" || forcedSurface === "inline"}
                onClick={() => toggleUtilityPanel("dev")}
              />
            </div>

            <div className="realm-dock-context">
              {isSetupPhase ? (
                <div className="realm-inline-guidance">
                  <span className="realm-inline-chip realm-inline-chip-gold">
                    {model.currentActorIsSelf
                      ? model.requiredAction === "PLACE_INITIAL_ROAD"
                        ? "Setup: Place road"
                        : "Setup: Place settlement"
                      : `Setup: ${model.currentActorDisplayName ?? "Player"} is acting`}
                  </span>
                  <p className="realm-inline-copy">
                    {model.currentActorIsSelf
                      ? model.requiredAction === "PLACE_INITIAL_ROAD"
                        ? "Your settlement is anchored. Choose one of the highlighted connecting roads to complete the opening claim."
                        : "Choose one highlighted legal intersection to anchor your first settlement. The board only exposes legal targets."
                      : "The board remains locked on the current setup action until the snake order advances."}
                  </p>
                </div>
              ) : isBuildMenuOpen ? (
                <div className="realm-build-ribbon">
                  <DockButton
                    label="Road"
                    active={buildMode === "ROAD" || boardMode === "BUILD_ROAD"}
                    disabled={!match.allowedActions?.includes("BUILD_ROAD")}
                    onClick={() => toggleBuildSelection("ROAD", "BUILD_ROAD")}
                  />
                  <DockButton
                    label="Settlement"
                    active={buildMode === "SETTLEMENT" || boardMode === "BUILD_SETTLEMENT"}
                    disabled={!match.allowedActions?.includes("BUILD_SETTLEMENT")}
                    onClick={() => toggleBuildSelection("SETTLEMENT", "BUILD_SETTLEMENT")}
                  />
                  <DockButton
                    label="City"
                    active={buildMode === "CITY" || boardMode === "UPGRADE_CITY"}
                    disabled={!match.allowedActions?.includes("UPGRADE_CITY")}
                    onClick={() => toggleBuildSelection("CITY", "UPGRADE_CITY")}
                  />
                  <div className="realm-inline-guidance">
                    <span className="realm-inline-chip">
                      Wood {model.tradeRatios.wood}:1 · Brick {model.tradeRatios.brick}:1 · Sheep {model.tradeRatios.sheep}:1
                    </span>
                    <p className="realm-inline-copy">{boardSelectionHint ?? "Select a structure, then place it on a highlighted legal target."}</p>
                  </div>
                </div>
              ) : (
                <div className="realm-inline-guidance">
                  <span className={`realm-inline-chip ${model.requiredAction ? "realm-inline-chip-gold" : ""}`}>
                    {model.phaseLabel}
                    {room?.roomCode ? ` · Room ${room.roomCode}` : ""}
                  </span>
                  <p className="realm-inline-copy">{boardSelectionHint ?? model.primaryDescription}</p>
                </div>
              )}
            </div>

            <div className="realm-dock-primary-actions">

              {canBuyDevCard && activeUtility !== "dev" ? (
                <button type="button" className="realm-primary-turn-button realm-primary-turn-button-secondary" onClick={() => toggleUtilityPanel("dev")}>
                  <span className="realm-end-turn-eyebrow">Council treasury</span>
                  <span className="realm-end-turn-title">Buy / Play Cards</span>
                  <span className="realm-end-turn-mark">
                    <ChronicleIcon kind="develop" />
                  </span>
                </button>
              ) : null}

              <button
                type="button"
                className="realm-end-turn-icon-button"
                disabled={!(match.allowedActions?.includes("END_TURN") ?? false) || forcedSurface !== null}
                onClick={() => void submit(client, match, "END_TURN", {})}
                aria-label="End Turn"
                title="End Turn"
              >
                <ChronicleIcon kind="hourglass" />
              </button>
            </div>
          </section>
        </div>
      </ClientErrorBoundary>
    </AppShell>
  );
}

function splitRoll(total: number): [number, number] {
  const min = Math.max(1, total - 6);
  const max = Math.min(6, total - 1);
  const die1 = min + Math.floor(Math.random() * (max - min + 1));
  return [die1, total - die1];
}

function DieFace({ value, delay }: { value: number; delay: number }) {
  const dots: [number, number][] = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
  }[value] ?? [[50, 50]];

  return (
    <div className="realm-die" style={{ animationDelay: `${delay}ms` }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={value === 6 ? 7.5 : 8} fill="#1c1814" />
        ))}
      </svg>
    </div>
  );
}

function BoardDice({
  canRollDice,
  lastRoll,
  onRollDice,
}: {
  canRollDice: boolean;
  lastRoll: number | undefined;
  onRollDice: () => void;
}) {
  const rollRef = useRef<number | null>(null);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (typeof lastRoll === "number" && rollRef.current !== lastRoll) {
      rollRef.current = lastRoll;
      setDice(splitRoll(lastRoll));
      setAnimKey((k) => k + 1);
    }
  }, [lastRoll]);

  const hasResult = typeof lastRoll === "number" && !canRollDice;

  return (
    <div className={`board-dice-tray${canRollDice ? " board-dice-tray-ready" : ""}`} key={animKey}>
      {([0, 1] as const).map((i) => (
        <button
          key={i}
          type="button"
          className={`board-die${canRollDice ? " board-die-ready" : ""}${hasResult ? " board-die-result" : ""}`}
          disabled={!canRollDice}
          onClick={canRollDice ? onRollDice : undefined}
          style={{ animationDelay: canRollDice ? `${i * 120}ms` : "0ms" }}
          aria-label={canRollDice ? "Roll dice" : undefined}
        >
          {hasResult ? (
            <DieFace value={dice[i]} delay={i * 60} />
          ) : (
            <svg viewBox="0 0 100 100" aria-hidden="true" />
          )}
        </button>
      ))}
    </div>
  );
}

function DiceRollTray({ roll, inactive }: { roll: number; inactive: boolean }) {
  const rollRef = useRef<number | null>(null);
  const [dice, setDice] = useState<[number, number]>(() => splitRoll(roll));
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (rollRef.current !== roll) {
      rollRef.current = roll;
      setDice(splitRoll(roll));
      setAnimKey((k) => k + 1);
    }
  }, [roll]);

  return (
    <div className={`realm-roll-tray${inactive ? " realm-roll-tray-inactive" : ""}`} aria-label={`Last roll: ${roll}`} key={animKey}>
      <DieFace value={dice[0]} delay={0} />
      <DieFace value={dice[1]} delay={60} />
    </div>
  );
}

function DockButton({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon?: IconKind;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`dock-button realm-dock-button ${active ? "dock-button-active" : ""}`} disabled={disabled} onClick={onClick}>
      {icon ? (
        <span className="realm-dock-button-icon">
          <ChronicleIcon kind={icon} />
        </span>
      ) : null}
      <span className="realm-dock-button-label">{label}</span>
    </button>
  );
}

function CouncilSeatCard({
  player,
}: {
  player: NonNullable<ReturnType<typeof createMatchScreenModel>>["players"][number];
}) {
  return (
    <article
      className={`realm-council-card ${player.isSelf ? "realm-council-card-self" : ""} ${player.isActive ? "realm-council-card-active" : ""}`}
    >
      <span className={`realm-council-accent ${playerColorToken(player.color)}`} />
      <div className="realm-council-card-body">
        <div className="realm-council-card-top">
          <span className={`realm-council-avatar ${playerColorToken(player.color)}`}>
            <ChronicleIcon kind="council-member" />
          </span>
          <div className="realm-council-copy">
            <p className="realm-council-name">
              {player.displayName}
              {player.isSelf ? " (You)" : ""}
            </p>
            <p className="realm-council-subline">{player.isHost ? "Host of the table" : `Seat ${player.turnOrder + 1}`}</p>
          </div>
          <span className="realm-council-status-dot" />
        </div>
        <div className="realm-council-stats">
          <span className="realm-council-stat-chip realm-council-stat-chip-vp">⚑ {player.visiblePoints} VP</span>
          <span className="realm-council-stat-chip">{player.resourceCardCount} cards</span>
        </div>
      </div>
    </article>
  );
}

function MatchSidebarPanel({
  activeUtility,
  snapshot,
  model,
  match,
  tradeGive,
  tradeWant,
  bankGive,
  bankWant,
  setTradeGive,
  setTradeWant,
  setBankGive,
  setBankWant,
  activeTradeId,
  acceptedCounterpartyPlayerId,
  sandboxIdentities,
  onSubmit,
  onOpenLog,
  onOpenTools,
  onCloseUtility,
  onReattach,
  onAdvanceSandbox,
  onSwitchSandboxIdentity,
  recentChronicleEntries,
}: {
  activeUtility: MatchUtilityPanel;
  snapshot: ReturnType<typeof useRealtimeSnapshot>["snapshot"];
  model: NonNullable<ReturnType<typeof createMatchScreenModel>>;
  match: MatchView;
  tradeGive: ResourceCounts;
  tradeWant: ResourceCounts;
  bankGive: ResourceCounts;
  bankWant: ResourceCounts;
  setTradeGive: (next: ResourceCounts) => void;
  setTradeWant: (next: ResourceCounts) => void;
  setBankGive: (next: ResourceCounts) => void;
  setBankWant: (next: ResourceCounts) => void;
  activeTradeId?: string | undefined;
  acceptedCounterpartyPlayerId?: string | undefined;
  sandboxIdentities: Array<{ sessionId: string; displayName: string; playerId: string; isCurrent: boolean }>;
  onSubmit: (commandType: MatchCommandType, payload: Record<string, unknown>) => void;
  onOpenLog: () => void;
  onOpenTools: () => void;
  onCloseUtility: () => void;
  onReattach: () => void;
  onAdvanceSandbox?: (() => void) | undefined;
  onSwitchSandboxIdentity: (sessionId: string) => void;
  recentChronicleEntries: ReturnType<typeof useRealtimeSnapshot>["snapshot"]["eventLog"];
}) {
  const title =
    activeUtility === "trade"
      ? "Trade Ledger"
      : activeUtility === "dev"
        ? "Development Deck"
        : activeUtility === "log"
          ? "Chronicle"
          : activeUtility === "tools"
            ? "Table Tools"
            : "Chronicle";

  return (
    <section className="realm-sidebar-panel">
      <div className="realm-sidebar-panel-header">
        <div>
          <p className="realm-sidebar-panel-kicker">{activeUtility ? "Active drawer" : "Recent events"}</p>
          <h3 className="realm-sidebar-panel-title">{title}</h3>
        </div>
        {activeUtility ? (
          <button type="button" className="secondary-button small-button" onClick={onCloseUtility}>
            Close
          </button>
        ) : null}
      </div>

      {activeUtility === "trade" ? (
        <div className="realm-sidebar-panel-body">
          <div className="rail-block">
            <div className="section-header compact">
              <div>
                <h2 className="section-title">Player trade</h2>
                <p className="subtle-copy">Offer to the full table, collect responses, then confirm one accepted deal.</p>
              </div>
            </div>
            <TradeComposer
              giveResources={tradeGive}
              wantResources={tradeWant}
              onGiveChange={setTradeGive}
              onWantChange={setTradeWant}
              giveLabel="Give"
              wantLabel="Want"
            />
            <button
              className="action-button"
              disabled={!(match.allowedActions?.includes("OFFER_TRADE") ?? false)}
              onClick={() => onSubmit("OFFER_TRADE", { offeredResources: tradeGive, requestedResources: tradeWant })}
            >
              Offer trade
            </button>
            {match.tradeOffer ? (
              <div className="trade-summary">
                <p className="resource-card-title">Open offer</p>
                <p className="subtle-copy">
                  Giving {resourceSummary(match.tradeOffer.offeredResources)} for {resourceSummary(match.tradeOffer.requestedResources)}
                </p>
                <div className="cost-row">
                  {match.tradeOffer.acceptedPlayerIds.map((playerId) => (
                    <span key={playerId} className="micro-stat success-pill">
                      {model.players.find((player) => player.playerId === playerId)?.displayName ?? playerId} yes
                    </span>
                  ))}
                  {match.tradeOffer.rejectedPlayerIds.map((playerId) => (
                    <span key={playerId} className="micro-stat danger-pill">
                      {model.players.find((player) => player.playerId === playerId)?.displayName ?? playerId} no
                    </span>
                  ))}
                </div>
                <div className="cluster">
                  {model.requiredAction === "RESPOND_TRADE" ? (
                    <>
                      <button className="action-button success-button" onClick={() => onSubmit("RESPOND_TRADE", { tradeId: match.tradeOffer?.tradeId, response: "accept" })}>
                        Accept
                      </button>
                      <button className="action-button danger-button" onClick={() => onSubmit("RESPOND_TRADE", { tradeId: match.tradeOffer?.tradeId, response: "reject" })}>
                        Reject
                      </button>
                    </>
                  ) : null}
                  {(match.allowedActions?.includes("CONFIRM_TRADE") ?? false) ? (
                    <button
                      className="action-button"
                      disabled={!activeTradeId || !acceptedCounterpartyPlayerId}
                      onClick={() =>
                        activeTradeId && acceptedCounterpartyPlayerId
                          ? onSubmit("CONFIRM_TRADE", {
                              tradeId: activeTradeId,
                              counterpartyPlayerId: acceptedCounterpartyPlayerId,
                            })
                          : undefined
                      }
                    >
                      Confirm trade
                    </button>
                  ) : null}
                  {(match.allowedActions?.includes("CANCEL_TRADE") ?? false) ? (
                    <button
                      className="action-button secondary-button"
                      disabled={!activeTradeId}
                      onClick={() => (activeTradeId ? onSubmit("CANCEL_TRADE", { tradeId: activeTradeId }) : undefined)}
                    >
                      Cancel offer
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rail-block">
            <div className="section-header compact">
              <div>
                <h2 className="section-title">Bank / Harbor</h2>
                <p className="subtle-copy">Rates: {RESOURCE_TYPES.map((resource) => `${resourceLabel(resource)} ${model.tradeRatios[resource]}:1`).join(" · ")}</p>
              </div>
            </div>
            <TradeComposer
              giveResources={bankGive}
              wantResources={bankWant}
              onGiveChange={setBankGive}
              onWantChange={setBankWant}
              giveLabel="Give"
              wantLabel="Receive"
            />
            <button
              className="action-button"
              disabled={!(match.allowedActions?.includes("TRADE_WITH_BANK") ?? false)}
              onClick={() => onSubmit("TRADE_WITH_BANK", { giveResources: bankGive, receiveResources: bankWant })}
            >
              Trade with bank
            </button>
          </div>
        </div>
      ) : null}

      {activeUtility === "dev" ? (
        <div className="realm-sidebar-panel-body">
          <div className="rail-block">
            <p className="eyebrow">Development cards</p>
            <div className="devcard-stack">
              {developmentCardEntries(match.ownDevelopmentCards).map((card) => (
                <div key={card.type} className="devcard-row">
                  <div>
                    <p className="resource-card-title">{card.label}</p>
                    <p className="subtle-copy">x{card.count}</p>
                  </div>
                  {card.action ? (
                    <button
                      className="secondary-button small-button"
                      disabled={card.count === 0 || !(match.allowedActions?.includes(card.action) ?? false)}
                      onClick={() => onSubmit(card.action, {})}
                    >
                      Play
                    </button>
                  ) : (
                    <span className="micro-stat">Hidden</span>
                  )}
                </div>
              ))}
            </div>
            <button className="action-button" disabled={!(match.allowedActions?.includes("BUY_DEV_CARD") ?? false)} onClick={() => onSubmit("BUY_DEV_CARD", {})}>
              Buy development card
            </button>
            {model.requiredAction === "PICK_YEAR_OF_PLENTY_RESOURCE" || model.requiredAction === "PICK_MONOPOLY_RESOURCE_TYPE" ? (
              <div className="choice-row">
                {RESOURCE_TYPES.map((resourceType) => (
                  <button key={resourceType} className="secondary-button small-button" onClick={() => onSubmit(model.requiredAction!, { resourceType })}>
                    {resourceLabel(resourceType)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeUtility === "log" ? (
        <div className="realm-sidebar-panel-body event-stack">
          {snapshot.eventLog.length === 0 ? (
            <p className="subtle-copy">No chronicle entries yet for this session.</p>
          ) : (
            snapshot.eventLog
              .slice()
              .reverse()
              .map((message, index) => (
                <div key={`${message.type}-${index}`} className="event-row">
                  <AssetToken
                    asset={
                      message.type === "server.command_rejected"
                        ? "state_forced_action"
                        : message.type === "server.lifecycle_transition"
                          ? "log_victory"
                          : message.type === "server.match_snapshot"
                            ? "log_dice_roll"
                            : message.type === "server.room_updated"
                              ? "status_ready"
                              : "log_build"
                    }
                    tone={message.type === "server.command_rejected" ? "danger" : "paper"}
                    size="sm"
                  />
                  <p>{summarizeLogEntry(message)}</p>
                </div>
              ))
          )}
        </div>
      ) : null}

      {activeUtility === "tools" ? (
        <div className="realm-sidebar-panel-body">
          <div className="rail-block">
            <p className="eyebrow">Live status</p>
            <div className="status-grid">
              <span className="micro-stat">Self: {model.selfPlayer?.displayName ?? match.playerId}</span>
              <span className="micro-stat">Longest Road: {match.longestRoadLength ?? 0}</span>
              <span className="micro-stat">Largest Army: {match.largestArmySize ?? 0}</span>
            </div>
            {snapshot.lastRejected ? (
              <div className="inline-warning">
                <strong>{snapshot.lastRejected.reasonCode}</strong>: {snapshot.lastRejected.message}
              </div>
            ) : null}
            <div className="cluster">
              <button className="action-button secondary-button" onClick={onReattach}>
                Reattach
              </button>
              {sandboxIdentities.map((identity) => (
                <button
                  key={identity.sessionId}
                  className={`secondary-button small-button ${identity.isCurrent ? "button-active" : ""}`}
                  onClick={() => onSwitchSandboxIdentity(identity.sessionId)}
                >
                  {identity.displayName}
                </button>
              ))}
              {onAdvanceSandbox ? (
                <button className="action-button secondary-button" onClick={onAdvanceSandbox}>
                  Sandbox sync
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {activeUtility === null ? (
        <div className="realm-sidebar-panel-body">
          {snapshot.lastRejected ? (
            <div className="inline-warning">
              <strong>{snapshot.lastRejected.reasonCode}</strong>: {snapshot.lastRejected.message}
            </div>
          ) : null}
          <div className="realm-chronicle-list">
            {recentChronicleEntries.length === 0 ? (
              <p className="subtle-copy">No moves have been recorded yet.</p>
            ) : (
              recentChronicleEntries.map((message, index) => (
                <p key={`${message.type}-${index}`} className="realm-chronicle-entry">
                  • {summarizeLogEntry(message)}
                </p>
              ))
            )}
          </div>
          <div className="realm-sidebar-footer">
            <button type="button" className="realm-sidebar-action" onClick={onOpenTools}>
              View full stats
            </button>
            <button type="button" className="realm-sidebar-textlink" onClick={onOpenLog}>
              Open full chronicle
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ForcedActionStrip({
  match,
  model,
  discardRemaining,
  discardResources,
  onDiscardResourcesChange,
  discardConstraints,
  onSubmit,
}: {
  match: MatchView;
  model: ReturnType<typeof createMatchScreenModel>;
  discardRemaining: number;
  discardResources: ResourceCounts;
  onDiscardResourcesChange: (next: ResourceCounts) => void;
  discardConstraints: ResourceEditorConstraints;
  onSubmit: (commandType: MatchCommandType, payload: Record<string, unknown>) => void;
}) {
  if (!model) {
    return null;
  }

  if (model.requiredAction === "RESPOND_TRADE") {
    return (
      <div className="match-required-panel warning-block">
        <div className="section-header compact">
          <div>
            <p className="eyebrow">Pflichtaktion</p>
            <h2 className="section-title">Auf den Handel reagieren</h2>
          </div>
          <span className="badge status-warning">Trade Response</span>
        </div>
        <p className="subtle-copy">
          {match.tradeOffer
            ? `Gibt ${resourceSummary(match.tradeOffer.offeredResources)} gegen ${resourceSummary(match.tradeOffer.requestedResources)}.`
            : "Das offene Angebot wartet auf deine Antwort."}
        </p>
        <div className="choice-row">
          <button
            className="action-button success-button"
            onClick={() => onSubmit("RESPOND_TRADE", { tradeId: match.tradeOffer?.tradeId, response: "accept" })}
          >
            Annehmen
          </button>
          <button
            className="action-button danger-button"
            onClick={() => onSubmit("RESPOND_TRADE", { tradeId: match.tradeOffer?.tradeId, response: "reject" })}
          >
            Ablehnen
          </button>
        </div>
      </div>
    );
  }

  if (model.requiredAction === "PICK_YEAR_OF_PLENTY_RESOURCE" || model.requiredAction === "PICK_MONOPOLY_RESOURCE_TYPE") {
    return (
      <div className="match-required-panel warning-block">
        <div className="section-header compact">
          <div>
            <p className="eyebrow">Pflichtaktion</p>
            <h2 className="section-title">
              {model.requiredAction === "PICK_YEAR_OF_PLENTY_RESOURCE" ? "Ressource fuer Year of Plenty waehlen" : "Monopoly-Ressourcentyp waehlen"}
            </h2>
          </div>
          <span className="badge status-warning">Dev Card</span>
        </div>
        <div className="choice-row">
          {RESOURCE_TYPES.map((resourceType) => (
            <button
              key={resourceType}
              className="secondary-button small-button"
              onClick={() => onSubmit(model.requiredAction!, { resourceType })}
            >
              {resourceLabel(resourceType)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (model.requiredAction === "STEAL_RESOURCE") {
    return (
      <div className="match-required-panel warning-block">
        <div className="section-header compact">
          <div>
            <p className="eyebrow">Pflichtaktion</p>
            <h2 className="section-title">Zielspieler fuer den Diebstahl waehlen</h2>
          </div>
          <span className="badge status-warning">Robber</span>
        </div>
        <div className="choice-row">
          {(match.stealablePlayerIds ?? []).map((playerId) => (
            <button
              key={playerId}
              className="secondary-button small-button"
              onClick={() => onSubmit("STEAL_RESOURCE", { victimPlayerId: playerId })}
            >
              {model.players.find((player) => player.playerId === playerId)?.displayName ?? playerId}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (model.requiredAction === "DISCARD_RESOURCES") {
    return (
      <div className="match-required-panel danger-block">
        <div className="section-header compact">
          <div>
            <p className="eyebrow">Discard</p>
            <h2 className="section-title">Genau {match.requiredDiscardCount ?? 0} Karten abwerfen</h2>
          </div>
          <span className={`badge ${discardRemaining === 0 ? "status-success" : "status-warning"}`}>Rest: {discardRemaining}</span>
        </div>
        <ResourceEditor resources={discardResources} constraints={discardConstraints} onChange={onDiscardResourcesChange} />
        <button
          className="action-button danger-button"
          disabled={discardRemaining !== 0}
          onClick={() => onSubmit("DISCARD_RESOURCES", { resources: discardResources })}
        >
          Discard bestaetigen
        </button>
      </div>
    );
  }

  return null;
}

function TradeComposer({
  giveResources,
  wantResources,
  onGiveChange,
  onWantChange,
  giveLabel,
  wantLabel,
}: {
  giveResources: ResourceCounts;
  wantResources: ResourceCounts;
  onGiveChange: (next: ResourceCounts) => void;
  onWantChange: (next: ResourceCounts) => void;
  giveLabel: string;
  wantLabel: string;
}) {
  return (
    <div className="trade-composer">
      <div className="trade-composer-header">
        <span />
        <span className="trade-col-label">{giveLabel}</span>
        <span className="trade-col-label">{wantLabel}</span>
      </div>
      {RESOURCE_TYPES.map((type) => (
        <div key={type} className="trade-composer-row">
          <span className="trade-resource-label">{resourceLabel(type)}</span>
          <div className="editor-controls">
            <button
              className="step-button"
              disabled={giveResources[type] === 0}
              onClick={() => onGiveChange(nextResourceSelection(giveResources, type, -1))}
            >
              -
            </button>
            <span className="step-value">{giveResources[type]}</span>
            <button
              className="step-button"
              onClick={() => onGiveChange(nextResourceSelection(giveResources, type, 1))}
            >
              +
            </button>
          </div>
          <div className="editor-controls">
            <button
              className="step-button"
              disabled={wantResources[type] === 0}
              onClick={() => onWantChange(nextResourceSelection(wantResources, type, -1))}
            >
              -
            </button>
            <span className="step-value">{wantResources[type]}</span>
            <button
              className="step-button"
              onClick={() => onWantChange(nextResourceSelection(wantResources, type, 1))}
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResourceEditor({
  title,
  resources,
  onChange,
  constraints,
}: {
  title?: string;
  resources: ResourceCounts;
  onChange: (next: ResourceCounts) => void;
  constraints?: ResourceEditorConstraints;
}) {
  return (
    <div className="resource-editor">
      {title ? <p className="editor-title">{title}</p> : null}
      <div className="editor-grid">
        {resourceEntries(resources).map((resource) => (
          <div key={resource.type} className="editor-row">
            <span>{resource.label}</span>
            <div className="editor-controls">
              <button
                className="step-button"
                disabled={resources[resource.type] === 0}
                onClick={() => onChange(nextResourceSelection(resources, resource.type, -1, constraints))}
              >
                -
              </button>
              <span className="step-value">{resource.count}</span>
              <button
                className="step-button"
                disabled={!canIncrementResourceSelection(resources, resource.type, constraints)}
                onClick={() => onChange(nextResourceSelection(resources, resource.type, 1, constraints))}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function resourceSummary(resources: ResourceCounts) {
  const entries = resourceEntries(resources).filter((entry) => entry.count > 0);
  if (entries.length === 0) {
    return "nichts";
  }

  return entries.map((entry) => `${entry.label} x${entry.count}`).join(", ");
}

function describeBoardSelection(mode: MatchCommandType | undefined, match: MatchView): string | undefined {
  switch (mode) {
    case "PLACE_INITIAL_SETTLEMENT":
      return `${match.legalSettlementIntersectionIds?.length ?? 0} legal founding points are illuminated for your opening settlement.`;
    case "PLACE_INITIAL_ROAD":
      return `${match.legalRoadEdgeIds?.length ?? 0} connecting roads are available from your new settlement.`;
    case "BUILD_ROAD":
      return `${match.legalRoadEdgeIds?.length ?? 0} legale Strassen sind am Brett hervorgehoben.`;
    case "BUILD_SETTLEMENT":
      return `${match.legalSettlementIntersectionIds?.length ?? 0} legale Baupunkte stehen fuer eine Siedlung bereit.`;
    case "UPGRADE_CITY":
      return `${match.legalCityIntersectionIds?.length ?? 0} eigene Siedlungen koennen zur Stadt ausgebaut werden.`;
    default:
      return undefined;
  }
}

function phaseDisplayLabel(match: MatchView): string {
  if (match.matchStatus === "match_setup") {
    return "Setup Phase";
  }

  switch (match.turnPhase) {
    case "pre_roll_devcard_window":
      return "Council Phase";
    case "roll_pending":
      return "Roll Phase";
    case "discard_pending":
      return "Discard Phase";
    case "robber_pending":
      return "Robber Phase";
    case "action_phase":
      return match.tradeOffer ? "Trade Phase" : "Action Phase";
    case "devcard_resolution":
      return "Decree Phase";
    case "turn_end_pending":
      return "End Phase";
    default:
      return "Trade Phase";
  }
}

type IconKind =
  | "brand"
  | "wood"
  | "brick"
  | "sheep"
  | "wheat"
  | "ore"
  | "settings"
  | "log"
  | "council"
  | "council-member"
  | "build"
  | "trade"
  | "develop"
  | "hourglass"
  | "dice";

function ChronicleIcon({ kind }: { kind: IconKind }) {
  switch (kind) {
    case "brand":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 5h6l2 3h10v11H3z" fill="currentColor" opacity="0.92" />
          <path d="M3 5h6l2 3H3z" fill="currentColor" opacity="0.68" />
        </svg>
      );
    case "wood":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3 6 11h4l-2 4h4l-2 6 8-10h-4l2-4h-4z" fill="currentColor" />
        </svg>
      );
    case "brick":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="6" width="8" height="5" rx="1" fill="currentColor" />
          <rect x="13" y="6" width="8" height="5" rx="1" fill="currentColor" opacity="0.9" />
          <rect x="7" y="13" width="8" height="5" rx="1" fill="currentColor" opacity="0.8" />
        </svg>
      );
    case "sheep":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="9" cy="11" r="4" fill="currentColor" />
          <circle cx="14.5" cy="10" r="3.5" fill="currentColor" opacity="0.95" />
          <circle cx="16.5" cy="14" r="3" fill="currentColor" opacity="0.85" />
          <circle cx="7" cy="15" r="3" fill="currentColor" opacity="0.85" />
        </svg>
      );
    case "wheat":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 8c-2 0-3-1.5-3-3M12 8c2 0 3-1.5 3-3M12 13c-2 0-3-1.5-3-3M12 13c2 0 3-1.5 3-3M12 18c-2 0-3-1.5-3-3M12 18c2 0 3-1.5 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "ore":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m4 18 5-9 3 5 3-7 5 11z" fill="currentColor" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="3.5" fill="currentColor" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "log":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 4h10v16H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
          <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "council":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="8" cy="9" r="3" fill="currentColor" />
          <circle cx="16" cy="9" r="3" fill="currentColor" opacity="0.8" />
          <path d="M4 19c0-3 2.2-5 4.8-5h6.4C17.8 14 20 16 20 19" fill="currentColor" opacity="0.9" />
        </svg>
      );
    case "council-member":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" fill="currentColor" />
          <path d="M6 19c0-3.2 2.5-5.5 6-5.5s6 2.3 6 5.5" fill="currentColor" opacity="0.88" />
        </svg>
      );
    case "build":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 20h8M10 20v-5l2-7 2 7v5M9 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "trade":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 8h11m0 0-3-3m3 3-3 3M19 16H8m0 0 3-3m-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "develop":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 5h6a3 3 0 0 1 3 3v11H8a3 3 0 0 0-3 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M19 5h-6a3 3 0 0 0-3 3v11h6a3 3 0 0 1 3 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "hourglass":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 4h8M8 20h8M8 4c0 4 4 4 4 8s-4 4-4 8M16 4c0 4-4 4-4 8s4 4 4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "dice":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
          <circle cx="9" cy="9" r="1.3" fill="currentColor" />
          <circle cx="15" cy="15" r="1.3" fill="currentColor" />
          <circle cx="15" cy="9" r="1.3" fill="currentColor" />
          <circle cx="9" cy="15" r="1.3" fill="currentColor" />
        </svg>
      );
  }
}
