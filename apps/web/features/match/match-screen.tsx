"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { GameBoard } from "../../components/game-board";
import { AppShell } from "../../components/shell";
import { AssetToken } from "../../lib/assets/manifest";
import { useRealtimeSnapshot } from "../../lib/realtime/use-realtime";
import {
  actionLabel,
  bestTradeRatioByResource,
  buildPlayerLookup,
  developmentCardEntries,
  matchPhaseLabel,
  playerColorToken,
  playerStatusText,
  resourceEntries,
  resourceLabel,
  roomStatusBadge,
  summarizeLogEntry,
} from "../../lib/ui/view-model";
import type { MatchCommandType, MatchView, ResourceCounts, ResourceType } from "@siedler/shared-types";

const BOARD_ACTIONS = new Set<MatchCommandType>([
  "PLACE_INITIAL_SETTLEMENT",
  "PLACE_INITIAL_ROAD",
  "BUILD_ROAD",
  "BUILD_SETTLEMENT",
  "UPGRADE_CITY",
  "MOVE_ROBBER",
]);

const RESOURCE_TYPES: ResourceType[] = ["wood", "brick", "sheep", "wheat", "ore"];

const BUILD_COSTS: Array<{ title: string; cost: Partial<ResourceCounts> }> = [
  { title: "Strasse", cost: { wood: 1, brick: 1 } },
  { title: "Siedlung", cost: { wood: 1, brick: 1, sheep: 1, wheat: 1 } },
  { title: "Stadt", cost: { wheat: 2, ore: 3 } },
  { title: "Entwicklung", cost: { sheep: 1, wheat: 1, ore: 1 } },
];

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

function sumResources(resources: ResourceCounts): number {
  return resources.wood + resources.brick + resources.sheep + resources.wheat + resources.ore;
}

function isBoardAction(action: MatchCommandType | undefined): action is MatchCommandType {
  return !!action && BOARD_ACTIONS.has(action);
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
  const { client, session, snapshot } = useRealtimeSnapshot();
  const room = snapshot.room;
  const match = snapshot.match?.matchId === matchId ? snapshot.match : undefined;
  const board = snapshot.board;
  const playerLookup = useMemo(() => buildPlayerLookup(room), [room]);
  const roomBadge = room ? roomStatusBadge(room) : undefined;
  const [selectedBoardAction, setSelectedBoardAction] = useState<MatchCommandType>();
  const [tradeGive, setTradeGive] = useState<ResourceCounts>(emptyResources());
  const [tradeWant, setTradeWant] = useState<ResourceCounts>(emptyResources());
  const [bankGive, setBankGive] = useState<ResourceCounts>(emptyResources());
  const [bankWant, setBankWant] = useState<ResourceCounts>(emptyResources());
  const [discardResources, setDiscardResources] = useState<ResourceCounts>(emptyResources());
  const boardMode = isBoardAction(match?.requiredAction) ? match.requiredAction : selectedBoardAction;
  const tradeRatios = useMemo(() => bestTradeRatioByResource(board, match?.playerId), [board, match?.playerId]);

  useEffect(() => {
    if (!match) {
      return;
    }

    if (isBoardAction(match.requiredAction)) {
      setSelectedBoardAction(undefined);
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
  }, [match]);

  if (!match) {
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
  const primaryAction = match.actionContext?.title ?? (match.activePlayerId === match.playerId ? "Du bist am Zug." : "Warten.");
  const requiredAction = match.requiredAction;
  const discardRemaining = Math.max(0, (match.requiredDiscardCount ?? 0) - sumResources(discardResources));

  return (
    <AppShell
      title={`Table ${room?.roomCode ?? match.matchId.slice(-6)}`}
      kicker="Live Match"
      actions={
        <div className="header-actions">
          <span className={`badge ${roomBadge ? `status-${roomBadge.tone}` : "status-muted"}`}>{roomBadge?.label ?? "Match"}</span>
          <span className={`badge ${match.requiredAction ? "status-warning" : "status-muted"}`}>{matchPhaseLabel(match)}</span>
          {room?.roomCode ? (
            <Link href={`/room/${room.roomCode}`} className="action-button secondary-button">
              Zur Lobby
            </Link>
          ) : null}
        </div>
      }
    >
      <div className="players-strip">
        {players.map((player) => (
          <article
            key={player.playerId}
            className={`player-chip ${player.isSelf ? "player-chip-self" : ""} ${player.isActive ? "player-chip-active" : ""}`}
          >
            <div className="player-chip-top">
              <span className={`player-swatch ${playerColorToken(player.color)}`} />
              <div>
                <p className="player-name">
                  {player.displayName}
                  {player.isHost ? <span className="micro-tag">HOST</span> : null}
                </p>
                <p className="player-meta">Seat {player.turnOrder + 1}</p>
              </div>
            </div>
            <div className="player-chip-stats">
              <span className="micro-stat">{player.visiblePoints} VP</span>
              <span className="micro-stat">{player.resourceCardCount} Karten</span>
              <span className="micro-stat">{player.developmentCardCount} Dev</span>
              <span className="micro-stat">{player.playedKnightCount} Knight</span>
            </div>
            <p className="player-status">{playerStatusText(player)}</p>
          </article>
        ))}
      </div>

      <div className="match-layout">
        <section className="match-main">
          <div className={`hero-panel ${match.actionContext?.tone ? `tone-${match.actionContext.tone}` : "tone-neutral"}`}>
            <div>
              <p className="eyebrow">Action Context</p>
              <h1 className="display-title hero-title">{primaryAction}</h1>
              <p className="hero-copy">
                {match.actionContext?.description ?? "Waehle rechts eine Aktion und fuehre sie direkt ueber das Brett oder die Handkarten aus."}
              </p>
            </div>
            <div className="hero-stats">
              <span className="hero-pill">Aktiver Spieler: {players.find((player) => player.isActive)?.displayName ?? "n/a"}</span>
              <span className="hero-pill">Letzter Wurf: {match.lastRoll ?? "noch keiner"}</span>
              <span className="hero-pill">
                Punkte: {match.visiblePointsByPlayerId?.[match.playerId] ?? 0} sichtbar / {match.totalPointsForPlayer ?? 0} gesamt
              </span>
              <span className="hero-pill">Versteckte VP: {match.ownHiddenPoints ?? 0}</span>
            </div>
          </div>

          <div className="board-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Board</p>
                <h2 className="section-title">
                  {boardMode ? `${actionLabel(boardMode)} auf dem Brett auswaehlen` : "Direkte Brettinteraktion"}
                </h2>
              </div>
              <div className="section-meta">
                {boardMode ? <span className="badge status-warning">Board Mode: {actionLabel(boardMode)}</span> : <span className="badge status-muted">Freie Ansicht</span>}
                <span className="badge">Longest Road: {players.find((player) => player.playerId === match.longestRoadHolderPlayerId)?.displayName ?? "frei"}</span>
                <span className="badge">Largest Army: {players.find((player) => player.playerId === match.largestArmyHolderPlayerId)?.displayName ?? "frei"}</span>
              </div>
            </div>

            <GameBoard
              board={board}
              room={room}
              match={match}
              mode={boardMode}
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
          </div>

          <div className="two-column-grid">
            <section className="panel match-subpanel">
              <div className="section-header compact">
                <div>
                  <p className="eyebrow">Production & Costs</p>
                  <h2 className="section-title">Baukosten und Hafenvorteile</h2>
                </div>
              </div>
              <div className="cost-grid">
                {BUILD_COSTS.map((entry) => (
                  <div key={entry.title} className="cost-card">
                    <p className="cost-title">{entry.title}</p>
                    <div className="cost-row">
                      {RESOURCE_TYPES.map((resource) => {
                        const amount = entry.cost[resource] ?? 0;
                        if (!amount) {
                          return null;
                        }
                        return (
                          <span key={`${entry.title}-${resource}`} className="micro-stat">
                            {resourceLabel(resource)} x{amount}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="cost-card">
                  <p className="cost-title">Bank / Hafen</p>
                  <div className="cost-row">
                    {RESOURCE_TYPES.map((resource) => (
                      <span key={resource} className="micro-stat">
                        {resourceLabel(resource)} {tradeRatios[resource]}:1
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="panel match-subpanel">
              <div className="section-header compact">
                <div>
                  <p className="eyebrow">Event Log</p>
                  <h2 className="section-title">Spielverlauf</h2>
                </div>
              </div>
              <div className="event-stack">
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
            </section>
          </div>
        </section>

        <aside className="command-rail">
          <section className="panel rail-panel">
            <p className="eyebrow">Turn Rail</p>
            <div className="rail-actions">
              <ActionButton label={actionLabel("ROLL_DICE")} enabled={match.allowedActions?.includes("ROLL_DICE") ?? false} onClick={() => void submit(client, match, "ROLL_DICE", {})} />
              <ActionButton label={actionLabel("BUY_DEV_CARD")} enabled={match.allowedActions?.includes("BUY_DEV_CARD") ?? false} onClick={() => void submit(client, match, "BUY_DEV_CARD", {})} />
              <ActionButton
                label={actionLabel("BUILD_ROAD")}
                enabled={match.allowedActions?.includes("BUILD_ROAD") ?? false}
                active={boardMode === "BUILD_ROAD"}
                onClick={() => setSelectedBoardAction((current) => (current === "BUILD_ROAD" ? undefined : "BUILD_ROAD"))}
              />
              <ActionButton
                label={actionLabel("BUILD_SETTLEMENT")}
                enabled={match.allowedActions?.includes("BUILD_SETTLEMENT") ?? false}
                active={boardMode === "BUILD_SETTLEMENT"}
                onClick={() => setSelectedBoardAction((current) => (current === "BUILD_SETTLEMENT" ? undefined : "BUILD_SETTLEMENT"))}
              />
              <ActionButton
                label={actionLabel("UPGRADE_CITY")}
                enabled={match.allowedActions?.includes("UPGRADE_CITY") ?? false}
                active={boardMode === "UPGRADE_CITY"}
                onClick={() => setSelectedBoardAction((current) => (current === "UPGRADE_CITY" ? undefined : "UPGRADE_CITY"))}
              />
              <ActionButton label={actionLabel("END_TURN")} enabled={match.allowedActions?.includes("END_TURN") ?? false} onClick={() => void submit(client, match, "END_TURN", {})} />
            </div>
          </section>

          <section className="panel rail-panel">
            <p className="eyebrow">Own Hand</p>
            <div className="resource-grid">
              {resourceEntries(match.ownResources).map((resource) => (
                <div key={resource.type} className="resource-card">
                  <AssetToken asset={`resource_${resource.type}` as const} tone="paper" />
                  <div>
                    <p className="resource-card-title">{resource.label}</p>
                    <p className="resource-card-count">{resource.count}</p>
                  </div>
                </div>
              ))}
            </div>
            {requiredAction === "DISCARD_RESOURCES" ? (
              <div className="rail-block danger-block">
                <div className="section-header compact">
                  <div>
                    <p className="eyebrow">Discard</p>
                    <h2 className="section-title">Genau {match.requiredDiscardCount ?? 0} Karten abwerfen</h2>
                  </div>
                  <span className={`badge ${discardRemaining === 0 ? "status-success" : "status-warning"}`}>
                    Rest: {discardRemaining}
                  </span>
                </div>
                <ResourceEditor resources={discardResources} onChange={setDiscardResources} />
                <button
                  className="action-button danger-button"
                  disabled={discardRemaining !== 0}
                  onClick={() => void submit(client, match, "DISCARD_RESOURCES", { resources: discardResources })}
                >
                  Discard bestaetigen
                </button>
              </div>
            ) : null}
          </section>

          <section className="panel rail-panel">
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
              {requiredAction === "PICK_YEAR_OF_PLENTY_RESOURCE" || requiredAction === "PICK_MONOPOLY_RESOURCE_TYPE" ? (
                <div className="choice-row">
                  {RESOURCE_TYPES.map((resourceType) => (
                    <button
                      key={resourceType}
                      className="secondary-button small-button"
                      onClick={() =>
                        void submit(client, match, requiredAction, {
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
          </section>

          <section className="panel rail-panel">
            <p className="eyebrow">Trading</p>
            <div className="rail-block">
              <div className="section-header compact">
                <div>
                  <h2 className="section-title">Spielerhandel</h2>
                  <p className="subtle-copy">Aktiver Spieler bietet, Gegner reagieren, dann bestaetigt der Host den Tausch.</p>
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
                  <p className="resource-card-title">
                    Angebot von {players.find((player) => player.playerId === match.tradeOffer?.offeredByPlayerId)?.displayName ?? match.tradeOffer.offeredByPlayerId}
                  </p>
                  <p className="subtle-copy">
                    Gibt {resourceSummary(match.tradeOffer.offeredResources)} gegen {resourceSummary(match.tradeOffer.requestedResources)}
                  </p>
                  <div className="cost-row">
                    {match.tradeOffer.acceptedPlayerIds.map((playerId) => (
                      <span key={playerId} className="micro-stat success-pill">
                        {players.find((player) => player.playerId === playerId)?.displayName ?? playerId} ok
                      </span>
                    ))}
                    {match.tradeOffer.rejectedPlayerIds.map((playerId) => (
                      <span key={playerId} className="micro-stat danger-pill">
                        {players.find((player) => player.playerId === playerId)?.displayName ?? playerId} nein
                      </span>
                    ))}
                  </div>
                  <div className="cluster">
                    {requiredAction === "RESPOND_TRADE" ? (
                      <>
                        <button className="action-button success-button" onClick={() => void submit(client, match, "RESPOND_TRADE", { tradeId: match.tradeOffer?.tradeId, response: "accept" })}>
                          Annehmen
                        </button>
                        <button className="action-button danger-button" onClick={() => void submit(client, match, "RESPOND_TRADE", { tradeId: match.tradeOffer?.tradeId, response: "reject" })}>
                          Ablehnen
                        </button>
                      </>
                    ) : null}
                    {(match.allowedActions?.includes("CONFIRM_TRADE") ?? false) ? (
                      <button
                        className="action-button"
                        onClick={() =>
                          void submit(client, match, "CONFIRM_TRADE", {
                            tradeId: match.tradeOffer?.tradeId,
                            counterpartyPlayerId: match.tradeOffer?.acceptedPlayerIds[0],
                          })
                        }
                      >
                        Tauschen
                      </button>
                    ) : null}
                    {(match.allowedActions?.includes("CANCEL_TRADE") ?? false) ? (
                      <button className="action-button secondary-button" onClick={() => void submit(client, match, "CANCEL_TRADE", { tradeId: match.tradeOffer?.tradeId })}>
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
                  <p className="subtle-copy">Server validiert das beste 2:1-, 3:1- oder 4:1-Verhaeltnis automatisch.</p>
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
          </section>

          <section className="panel rail-panel">
            <p className="eyebrow">Live Status</p>
            <div className="rail-block">
              <div className="status-grid">
                <span className="micro-stat">Ich: {selfPlayer?.displayName ?? match.playerId}</span>
                <span className="micro-stat">Longest Road: {match.longestRoadLength ?? 0}</span>
                <span className="micro-stat">Largest Army: {match.largestArmySize ?? 0}</span>
              </div>
              {requiredAction === "STEAL_RESOURCE" ? (
                <div className="choice-row">
                  {(match.stealablePlayerIds ?? []).map((playerId) => (
                    <button key={playerId} className="secondary-button small-button" onClick={() => void submit(client, match, "STEAL_RESOURCE", { victimPlayerId: playerId })}>
                      {players.find((player) => player.playerId === playerId)?.displayName ?? playerId}
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
                {client.supportsSandboxTools() ? (
                  <button className="action-button secondary-button" onClick={() => void client.advanceSandbox()}>
                    Sandbox sync
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function ActionButton({
  label,
  enabled,
  active,
  onClick,
}: {
  label: string;
  enabled: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`action-button ${active ? "button-active" : ""} ${enabled ? "" : "secondary-button"}`} disabled={!enabled} onClick={onClick}>
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
