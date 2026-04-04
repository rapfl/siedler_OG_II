"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ClientErrorBoundary } from "../../components/client-error-boundary";
import { GameBoard } from "../../components/game-board";
import { AppShell } from "../../components/shell";
import { AssetToken } from "../../lib/assets/manifest";
import { useRealtimeSnapshot } from "../../lib/realtime/use-realtime";
import { requiredActionPanel, requiredActionSurface, type MatchUtilityPanel } from "../../lib/ui/match-required-action";
import { createMatchScreenModel, developmentCardEntries, isBoardAction, sumResources } from "../../lib/ui/match-screen-model";
import { resourceEntries, resourceLabel, summarizeLogEntry } from "../../lib/ui/view-model";
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

function stepResources(resources: ResourceCounts, type: ResourceType, delta: number): ResourceCounts {
  return {
    ...resources,
    [type]: Math.max(0, resources[type] + delta),
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
    if (!match) {
      setDiscardResources(emptyResources());
    }
  }, [match]);

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

  const toggleBuildSelection = (nextMode: BuildMode, nextAction: Extract<MatchCommandType, "BUILD_ROAD" | "BUILD_SETTLEMENT" | "UPGRADE_CITY">) => {
    const shouldClear = buildMode === nextMode && selectedBoardAction === nextAction;
    setBuildMode(shouldClear ? null : nextMode);
    setSelectedBoardAction(shouldClear ? undefined : nextAction);
  };

  return (
    <AppShell
      title={`Table ${model.roomCode ?? match.matchId.slice(-6)}`}
      kicker="Live Match"
      pageClassName="shell-page-route"
      contentClassName="shell-content-route"
      actions={
        <div className="header-actions">
          <span className={`badge status-${model.roomBadgeTone}`}>{model.roomBadgeLabel}</span>
          <span className={`badge ${model.requiredAction ? "status-warning" : "status-muted"}`}>{model.phaseLabel}</span>
          {room?.roomCode ? (
            <Link href={`/room/${room.roomCode}`} className="action-button secondary-button">
              Zur Lobby
            </Link>
          ) : null}
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
        <div className="match-surface">
          <div className="match-top-strip">
            {model.players.map((player) => (
              <article
                key={player.playerId}
                className={`table-player-pill ${player.isSelf ? "table-player-pill-self" : ""} ${player.isActive ? "table-player-pill-active" : ""}`}
              >
                <span className={`player-swatch player-${player.color ?? "neutral"}`} />
                <div className="table-player-copy">
                  <p className="table-player-name">
                    {player.displayName}
                    {player.isHost ? <span className="micro-tag">HOST</span> : null}
                  </p>
                  <p className="table-player-meta">
                    {player.visiblePoints} VP · {player.resourceCardCount} Karten · {player.developmentCardCount} Dev
                  </p>
                </div>
              </article>
            ))}
          </div>

          <section className="match-board-stage">
              <div className="match-board-heading">
                <div>
                  <p className="eyebrow">Action Context</p>
                  <h1 className="display-title match-stage-title">{model.primaryAction}</h1>
                <p className="subtle-copy">
                  {model.primaryDescription}
                  {hoverTarget ? ` Aktuell: ${hoverTarget}.` : ""}
                </p>
              </div>
              <div className="match-stage-badges">
                <span className="hero-pill">Aktiver Spieler: {model.players.find((player) => player.isActive)?.displayName ?? "n/a"}</span>
                <span className="hero-pill">Wurf: {match.lastRoll ?? "noch keiner"}</span>
                <span className="hero-pill">Versteckte VP: {match.ownHiddenPoints ?? 0}</span>
              </div>
            </div>

            {forcedSurface === "inline" || forcedSurface === "trade" || forcedSurface === "dev" ? (
              <ForcedActionStrip
                match={match}
                model={model}
                discardRemaining={discardRemaining}
                discardResources={discardResources}
                onDiscardResourcesChange={setDiscardResources}
                onSubmit={(commandType, payload) => void submit(client, match, commandType, payload)}
              />
            ) : null}

            <div className="match-board-frame">
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

              {activeUtility ? (
                <aside className="match-utility-drawer">
                  <div className="match-drawer-header">
                    <p className="eyebrow">Utility</p>
                    <button className="secondary-button small-button" onClick={() => setActiveUtility(null)}>
                      Schliessen
                    </button>
                  </div>
                  {activeUtility === "trade" ? (
                    <div className="match-drawer-body">
                      <div className="rail-block">
                        <div className="section-header compact">
                          <div>
                            <h2 className="section-title">Spielerhandel</h2>
                            <p className="subtle-copy">Aktiver Spieler bietet, Gegner reagieren, dann wird final bestaetigt.</p>
                          </div>
                        </div>
                        <div className="composer-grid">
                          <ResourceEditor title="Ich gebe" resources={tradeGive} onChange={setTradeGive} />
                          <ResourceEditor title="Ich will" resources={tradeWant} onChange={setTradeWant} />
                        </div>
                        <button
                          className="action-button"
                          disabled={!(match.allowedActions?.includes("OFFER_TRADE") ?? false)}
                          onClick={() => void submit(client, match, "OFFER_TRADE", { offeredResources: tradeGive, requestedResources: tradeWant })}
                        >
                          Handel anbieten
                        </button>
                        {match.tradeOffer ? (
                          <div className="trade-summary">
                            <p className="resource-card-title">Offenes Angebot</p>
                            <p className="subtle-copy">
                              Gibt {resourceSummary(match.tradeOffer.offeredResources)} gegen {resourceSummary(match.tradeOffer.requestedResources)}
                            </p>
                            <div className="cost-row">
                              {match.tradeOffer.acceptedPlayerIds.map((playerId) => (
                                <span key={playerId} className="micro-stat success-pill">
                                  {model.players.find((player) => player.playerId === playerId)?.displayName ?? playerId} ok
                                </span>
                              ))}
                              {match.tradeOffer.rejectedPlayerIds.map((playerId) => (
                                <span key={playerId} className="micro-stat danger-pill">
                                  {model.players.find((player) => player.playerId === playerId)?.displayName ?? playerId} nein
                                </span>
                              ))}
                            </div>
                            <div className="cluster">
                              {model.requiredAction === "RESPOND_TRADE" ? (
                                <>
                                  <button
                                    className="action-button success-button"
                                    onClick={() => void submit(client, match, "RESPOND_TRADE", { tradeId: match.tradeOffer?.tradeId, response: "accept" })}
                                  >
                                    Annehmen
                                  </button>
                                  <button
                                    className="action-button danger-button"
                                    onClick={() => void submit(client, match, "RESPOND_TRADE", { tradeId: match.tradeOffer?.tradeId, response: "reject" })}
                                  >
                                    Ablehnen
                                  </button>
                                </>
                              ) : null}
                              {(match.allowedActions?.includes("CONFIRM_TRADE") ?? false) ? (
                                <button
                                  className="action-button"
                                  disabled={!activeTradeId || !acceptedCounterpartyPlayerId}
                                  onClick={() =>
                                    activeTradeId && acceptedCounterpartyPlayerId
                                      ? void submit(client, match, "CONFIRM_TRADE", {
                                          tradeId: activeTradeId,
                                          counterpartyPlayerId: acceptedCounterpartyPlayerId,
                                        })
                                      : undefined
                                  }
                                >
                                  Tauschen
                                </button>
                              ) : null}
                              {(match.allowedActions?.includes("CANCEL_TRADE") ?? false) ? (
                                <button
                                  className="action-button secondary-button"
                                  disabled={!activeTradeId}
                                  onClick={() => (activeTradeId ? void submit(client, match, "CANCEL_TRADE", { tradeId: activeTradeId }) : undefined)}
                                >
                                  Angebot schliessen
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="rail-block">
                        <div className="section-header compact">
                          <div>
                            <h2 className="section-title">Bank / Hafen</h2>
                            <p className="subtle-copy">Hafenraten: {RESOURCE_TYPES.map((resource) => `${resourceLabel(resource)} ${model.tradeRatios[resource]}:1`).join(" · ")}</p>
                          </div>
                        </div>
                        <div className="composer-grid">
                          <ResourceEditor title="Ich gebe" resources={bankGive} onChange={setBankGive} />
                          <ResourceEditor title="Ich erhalte" resources={bankWant} onChange={setBankWant} />
                        </div>
                        <button
                          className="action-button"
                          disabled={!(match.allowedActions?.includes("TRADE_WITH_BANK") ?? false)}
                          onClick={() => void submit(client, match, "TRADE_WITH_BANK", { giveResources: bankGive, receiveResources: bankWant })}
                        >
                          Mit Bank handeln
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {activeUtility === "dev" ? (
                    <div className="match-drawer-body">
                      <div className="rail-block">
                        <p className="eyebrow">Development Cards</p>
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
                                  onClick={() => void submit(client, match, card.action, {})}
                                >
                                  Spielen
                                </button>
                              ) : (
                                <span className="micro-stat">verdeckt</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          className="action-button"
                          disabled={!(match.allowedActions?.includes("BUY_DEV_CARD") ?? false)}
                          onClick={() => void submit(client, match, "BUY_DEV_CARD", {})}
                        >
                          Entwicklungskarte kaufen
                        </button>
                        {(model.requiredAction === "PICK_YEAR_OF_PLENTY_RESOURCE" || model.requiredAction === "PICK_MONOPOLY_RESOURCE_TYPE") ? (
                          <div className="choice-row">
                            {RESOURCE_TYPES.map((resourceType) => (
                              <button
                                key={resourceType}
                                className="secondary-button small-button"
                                onClick={() =>
                                  void submit(client, match, model.requiredAction!, {
                                    resourceType,
                                  })
                                }
                              >
                                {resourceLabel(resourceType)}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {activeUtility === "log" ? (
                    <div className="match-drawer-body event-stack">
                      {snapshot.eventLog.length === 0 ? (
                        <p className="subtle-copy">Noch keine Ereignisse in dieser Session.</p>
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
                    <div className="match-drawer-body">
                      <div className="rail-block">
                        <p className="eyebrow">Live Status</p>
                        <div className="status-grid">
                          <span className="micro-stat">Ich: {model.selfPlayer?.displayName ?? match.playerId}</span>
                          <span className="micro-stat">Longest Road: {match.longestRoadLength ?? 0}</span>
                          <span className="micro-stat">Largest Army: {match.largestArmySize ?? 0}</span>
                        </div>
                        {model.requiredAction === "STEAL_RESOURCE" ? (
                          <div className="choice-row">
                            {(match.stealablePlayerIds ?? []).map((playerId) => (
                              <button key={playerId} className="secondary-button small-button" onClick={() => void submit(client, match, "STEAL_RESOURCE", { victimPlayerId: playerId })}>
                                {model.players.find((player) => player.playerId === playerId)?.displayName ?? playerId}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        {snapshot.lastRejected ? (
                          <div className="inline-warning">
                            <strong>{snapshot.lastRejected.reasonCode}</strong>: {snapshot.lastRejected.message}
                          </div>
                        ) : null}
                        <div className="cluster">
                          <button className="action-button secondary-button" onClick={() => void client.reattachSession()}>
                            Reattach
                          </button>
                          {sandboxIdentities.map((identity) => (
                            <button
                              key={identity.sessionId}
                              className={`secondary-button small-button ${identity.isCurrent ? "button-active" : ""}`}
                              onClick={() => void client.switchSandboxIdentity(identity.sessionId)}
                            >
                              {identity.displayName}
                            </button>
                          ))}
                          {client.supportsSandboxTools() ? (
                            <button className="action-button secondary-button" onClick={() => void client.advanceSandbox()}>
                              Sandbox sync
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </aside>
              ) : null}
            </div>
          </section>

          <section className="match-bottom-dock">
            <div className="match-hand-strip">
              {resourceEntries(match.ownResources).map((resource) => (
                <article key={resource.type} className="hand-resource-card">
                  <AssetToken asset={`resource_${resource.type}` as const} tone="paper" />
                  <div>
                    <p className="resource-card-title">{resource.label}</p>
                    <p className="resource-card-count">{resource.count}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="match-dock-row">
              <div className="match-primary-dock">
                <DockButton
                  label="Roll"
                  active={false}
                  disabled={!(match.allowedActions?.includes("ROLL_DICE") ?? false)}
                  onClick={() => void submit(client, match, "ROLL_DICE", {})}
                />
                <DockButton
                  label="Build"
                  active={buildMode !== null || !!boardMode}
                  disabled={
                    !(
                      match.allowedActions?.includes("BUILD_ROAD") ||
                      match.allowedActions?.includes("BUILD_SETTLEMENT") ||
                      match.allowedActions?.includes("UPGRADE_CITY") ||
                      model.requiredAction === "PLACE_INITIAL_SETTLEMENT" ||
                      model.requiredAction === "PLACE_INITIAL_ROAD"
                    ) || forcedSurface === "trade" || forcedSurface === "dev" || forcedSurface === "inline"
                  }
                  onClick={() => {
                    setBuildMode((current) => (current ? null : "ROAD"));
                    setActiveUtility(null);
                  }}
                />
                <DockButton
                  label="Trade"
                  active={activeUtility === "trade"}
                  disabled={forcedSurface === "dev" || forcedSurface === "inline"}
                  onClick={() => setActiveUtility((current) => (current === "trade" ? null : "trade"))}
                />
                <DockButton
                  label="Dev"
                  active={activeUtility === "dev"}
                  disabled={forcedSurface === "trade" || forcedSurface === "inline"}
                  onClick={() => setActiveUtility((current) => (current === "dev" ? null : "dev"))}
                />
                <DockButton
                  label="End"
                  active={false}
                  disabled={!(match.allowedActions?.includes("END_TURN") ?? false) || forcedSurface !== null}
                  onClick={() => void submit(client, match, "END_TURN", {})}
                />
              </div>

              <div className="match-utility-tabs">
                <UtilityButton label="Log" active={activeUtility === "log"} onClick={() => setActiveUtility((current) => (current === "log" ? null : "log"))} />
                <UtilityButton label="Tools" active={activeUtility === "tools"} onClick={() => setActiveUtility((current) => (current === "tools" ? null : "tools"))} />
              </div>
            </div>

            <div className="match-build-row">
              {(model.requiredAction === "PLACE_INITIAL_SETTLEMENT" || model.requiredAction === "PLACE_INITIAL_ROAD") ? (
                <div className="inline-guidance">
                  <span className="badge status-warning">{model.requiredAction === "PLACE_INITIAL_SETTLEMENT" ? "Setup: Siedlung setzen" : "Setup: Strasse setzen"}</span>
                  <span className="subtle-copy">Waehle direkt auf dem Brett einen legalen Zielpunkt.</span>
                </div>
              ) : (
                <>
                  <DockButton
                    label="Road"
                    active={buildMode === "ROAD" || boardMode === "BUILD_ROAD"}
                    disabled={!(match.allowedActions?.includes("BUILD_ROAD") ?? false)}
                    onClick={() => {
                      toggleBuildSelection("ROAD", "BUILD_ROAD");
                    }}
                  />
                  <DockButton
                    label="Settlement"
                    active={buildMode === "SETTLEMENT" || boardMode === "BUILD_SETTLEMENT"}
                    disabled={!(match.allowedActions?.includes("BUILD_SETTLEMENT") ?? false)}
                    onClick={() => {
                      toggleBuildSelection("SETTLEMENT", "BUILD_SETTLEMENT");
                    }}
                  />
                  <DockButton
                    label="City"
                    active={buildMode === "CITY" || boardMode === "UPGRADE_CITY"}
                    disabled={!(match.allowedActions?.includes("UPGRADE_CITY") ?? false)}
                    onClick={() => {
                      toggleBuildSelection("CITY", "UPGRADE_CITY");
                    }}
                  />
                  <div className="inline-guidance">
                    <span className="badge status-muted">
                      Holz {model.tradeRatios.wood}:1 · Lehm {model.tradeRatios.brick}:1 · Wolle {model.tradeRatios.sheep}:1
                    </span>
                    {boardMode ? <span className="subtle-copy">Board Mode: {boardMode}</span> : <span className="subtle-copy">Build waehlen, dann am Brett platzieren.</span>}
                  </div>
                </>
              )}
            </div>

          </section>
        </div>
      </ClientErrorBoundary>
    </AppShell>
  );
}

function DockButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`dock-button ${active ? "dock-button-active" : ""}`} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

function ForcedActionStrip({
  match,
  model,
  discardRemaining,
  discardResources,
  onDiscardResourcesChange,
  onSubmit,
}: {
  match: MatchView;
  model: ReturnType<typeof createMatchScreenModel>;
  discardRemaining: number;
  discardResources: ResourceCounts;
  onDiscardResourcesChange: (next: ResourceCounts) => void;
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
        <ResourceEditor resources={discardResources} onChange={onDiscardResourcesChange} />
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

function UtilityButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`utility-button ${active ? "utility-button-active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

function ResourceEditor({
  title,
  resources,
  onChange,
}: {
  title?: string;
  resources: ResourceCounts;
  onChange: (next: ResourceCounts) => void;
}) {
  return (
    <div className="resource-editor">
      {title ? <p className="editor-title">{title}</p> : null}
      <div className="editor-grid">
        {resourceEntries(resources).map((resource) => (
          <div key={resource.type} className="editor-row">
            <span>{resource.label}</span>
            <div className="editor-controls">
              <button className="step-button" onClick={() => onChange(stepResources(resources, resource.type, -1))}>
                -
              </button>
              <span className="step-value">{resource.count}</span>
              <button className="step-button" onClick={() => onChange(stepResources(resources, resource.type, 1))}>
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
