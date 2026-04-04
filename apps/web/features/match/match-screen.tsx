"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "../../components/shell";
import { AssetToken } from "../../lib/assets/manifest";
import { useRealtimeSnapshot } from "../../lib/realtime/use-realtime";
import { boardRows, forcedFlowCopy, isActionEnabled, matchPhaseLabel, resourceEntries, summarizeLogEntry } from "../../lib/ui/view-model";
import type { ClientSubmitCommandMessage, GeneratedBoard, MatchCommandType, MatchView, ResourceCounts, ResourceType } from "@siedler/shared-types";

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

function numberStep(resources: ResourceCounts, type: ResourceType, delta: number): ResourceCounts {
  return {
    ...resources,
    [type]: Math.max(0, resources[type] + delta),
  };
}

function buildCandidates(board: GeneratedBoard | undefined, match: MatchView | undefined) {
  if (!board || !match) {
    return {
      road: [] as string[],
      settlement: [] as string[],
      city: [] as string[],
      robber: [] as string[],
    };
  }

  const road = Object.keys(board.edges).filter((edgeId) => !board.edges[edgeId]?.road).slice(0, 18);
  const settlement = Object.keys(board.intersections)
    .filter((intersectionId) => {
      const intersection = board.intersections[intersectionId];
      return !!intersection && !intersection.building && !intersection.adjacentIntersectionIds.some((adjacentId: string) => board.intersections[adjacentId]?.building);
    })
    .slice(0, 18);
  const city = Object.keys(board.intersections)
    .filter((intersectionId) => {
      const building = board.intersections[intersectionId]?.building;
      return building?.ownerPlayerId === match.playerId && building.buildingType === "settlement";
    })
    .slice(0, 12);
  const robber = Object.keys(board.hexes).filter((hexId) => hexId !== board.robberHexId);

  return {
    road,
    settlement,
    city,
    robber,
  };
}

async function submit(client: ReturnType<typeof useRealtimeSnapshot>["client"], match: MatchView, commandType: MatchCommandType, payload: Record<string, unknown>) {
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
  const forced = forcedFlowCopy(match);
  const rows = boardRows(board);
  const candidates = useMemo(() => buildCandidates(board, match), [board, match]);
  const [selectedRoad, setSelectedRoad] = useState<string>();
  const [selectedSettlement, setSelectedSettlement] = useState<string>();
  const [selectedCity, setSelectedCity] = useState<string>();
  const [tradeGive, setTradeGive] = useState<ResourceCounts>(emptyResources());
  const [tradeWant, setTradeWant] = useState<ResourceCounts>(emptyResources());
  const [bankGive, setBankGive] = useState<ResourceCounts>(emptyResources());
  const [bankWant, setBankWant] = useState<ResourceCounts>(emptyResources());

  if (!match) {
    return (
      <AppShell title="siedler_OG_II" kicker="Match">
        <div className="panel p-8">
          <p className="eyebrow">Match State</p>
          <h1 className="display-title mt-3 text-4xl">Kein passender Match-Snapshot.</h1>
          <p className="mt-4 text-[var(--text-muted)]">Oeffne ein aktives Match ueber den Room-Kontext oder Resume.</p>
          <div className="mt-6 flex gap-3">
            <Link href={session?.roomCode ? `/room/${session.roomCode}` : "/"} className="action-button">
              Zurueck
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Match ${match.matchId.slice(-6)}`}
      kicker="Match / Setup / Forced Flow"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <span className={`badge ${match.requiredAction ? "status-warning" : "status-muted"}`}>{matchPhaseLabel(match)}</span>
          {room?.roomCode ? (
            <Link href={`/room/${room.roomCode}`} className="action-button secondary-button">
              Zum Room
            </Link>
          ) : null}
        </div>
      }
    >
      <div className="grid-columns-main">
        <section className="grid gap-6">
          <div className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Action Guidance</p>
                <h1 className="display-title mt-3 text-4xl">
                  {forced?.title ?? (match.activePlayerId === match.playerId ? "Du bist am Zug." : "Beobachten oder reagieren.")}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">
                  {forced?.description ?? "Optional erlaubte Aktionen sind rechts gebuendelt. Forced States verdrängen normale Builds und Trades."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {match.requiredAction ? <span className="badge status-warning">Required: {match.requiredAction}</span> : null}
                <span className="badge">Active: {match.activePlayerId ?? "n/a"}</span>
                {match.lastRoll ? <span className="badge">Last Roll: {match.lastRoll}</span> : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="panel p-5">
                <p className="eyebrow">Board Surface</p>
                {board ? (
                  <div className="mt-4 grid gap-3">
                    {rows.map(([rowId, hexIds]) => (
                      <div key={rowId} className="flex flex-wrap justify-center gap-3">
                        {hexIds.map((hexId: string) => {
                          const hex = board.hexes[hexId];
                          if (!hex) {
                            return null;
                          }
                          const highlighted = match.legalSetupPlacements?.includes(hexId) || (match.requiredAction === "MOVE_ROBBER" && hex.hexId !== board.robberHexId);
                          return (
                            <button
                              key={hexId}
                              className={`card-surface min-w-[120px] rounded-[24px] px-4 py-4 text-left ${highlighted ? "ring-2 ring-[var(--accent)]" : ""}`}
                              onClick={() => {
                                if (match.requiredAction === "MOVE_ROBBER") {
                                  void submit(client, match, "MOVE_ROBBER", { targetHexId: hexId });
                                }
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[#8a6a47]">{hex.resourceType}</span>
                                {hex.hasRobber ? <AssetToken asset="piece_robber" tone="danger" size="sm" /> : null}
                              </div>
                              <p className="mt-3 font-semibold text-[#3c2d1f]">{hex.hexId}</p>
                              <p className="mt-2 text-sm text-[#73583d]">Token {hex.tokenNumber ?? "desert"}</p>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[var(--text-muted)]">Die lokale Mock-UI zeigt das Board nur, wenn ein Match-Snapshot mit oeffentlicher Boardlage vorliegt.</p>
                )}
              </div>

              <div className="grid gap-4">
                <div className="panel p-5">
                  <p className="eyebrow">Own Hand</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {resourceEntries(match.ownResources).map((resource) => (
                      <div key={resource.type} className="inlay flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <AssetToken asset={`resource_${resource.type}` as const} tone="paper" />
                          <span className="text-sm text-[var(--text-strong)]">{resource.label}</span>
                        </div>
                        <span className="badge">{resource.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="badge">Visible/Total: {match.visiblePointsByPlayerId?.[match.playerId] ?? 0}/{match.totalPointsForPlayer ?? 0}</span>
                    <span className="badge">Hidden VP: {match.ownHiddenPoints ?? 0}</span>
                  </div>
                </div>

                <div className="panel p-5">
                  <p className="eyebrow">Opponents</p>
                  <div className="mt-4 grid gap-3">
                    {match.playerOrder.filter((playerId: string) => playerId !== match.playerId).map((playerId: string) => (
                      <div key={playerId} className="inlay flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <AssetToken asset="state_waiting" tone={match.activePlayerId === playerId ? "felt" : "default"} />
                          <div>
                            <p className="text-sm text-[var(--text-strong)]">{playerId}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                              Visible {match.visiblePointsByPlayerId?.[playerId] ?? 0}
                            </p>
                          </div>
                        </div>
                        {match.tradeOffer?.acceptedPlayerIds.includes(playerId) ? <span className="badge status-success">accepted</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel p-6">
            <p className="eyebrow">Command Console</p>
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div className="grid gap-4">
                <ActionButton title="ROLL_DICE" enabled={isActionEnabled(match, "ROLL_DICE")} onClick={() => void submit(client, match, "ROLL_DICE", {})} />
                <ActionButton title="END_TURN" enabled={isActionEnabled(match, "END_TURN")} onClick={() => void submit(client, match, "END_TURN", {})} />
                <ActionButton title="BUY_DEV_CARD" enabled={isActionEnabled(match, "BUY_DEV_CARD")} onClick={() => void submit(client, match, "BUY_DEV_CARD", {})} />
                <ActionButton title="PLAY_DEV_CARD_KNIGHT" enabled={isActionEnabled(match, "PLAY_DEV_CARD_KNIGHT")} onClick={() => void submit(client, match, "PLAY_DEV_CARD_KNIGHT", {})} />
                <ActionButton title="PLAY_DEV_CARD_YEAR_OF_PLENTY" enabled={isActionEnabled(match, "PLAY_DEV_CARD_YEAR_OF_PLENTY")} onClick={() => void submit(client, match, "PLAY_DEV_CARD_YEAR_OF_PLENTY", {})} />
                <ActionButton title="PLAY_DEV_CARD_MONOPOLY" enabled={isActionEnabled(match, "PLAY_DEV_CARD_MONOPOLY")} onClick={() => void submit(client, match, "PLAY_DEV_CARD_MONOPOLY", {})} />
                <ActionButton title="PLAY_DEV_CARD_ROAD_BUILDING" enabled={isActionEnabled(match, "PLAY_DEV_CARD_ROAD_BUILDING")} onClick={() => void submit(client, match, "PLAY_DEV_CARD_ROAD_BUILDING", {})} />
              </div>

              <div className="grid gap-4">
                {match.requiredAction === "PLACE_INITIAL_SETTLEMENT" || isActionEnabled(match, "PLACE_INITIAL_SETTLEMENT") ? (
                  <PlacementGroup title="Initial Settlement" ids={match.legalSetupPlacements ?? []} onChoose={(intersectionId) => void submit(client, match, "PLACE_INITIAL_SETTLEMENT", { intersectionId })} />
                ) : null}
                {match.requiredAction === "PLACE_INITIAL_ROAD" || isActionEnabled(match, "PLACE_INITIAL_ROAD") ? (
                  <PlacementGroup title="Initial Road" ids={match.legalSetupPlacements ?? []} onChoose={(edgeId) => void submit(client, match, "PLACE_INITIAL_ROAD", { edgeId })} />
                ) : null}
                {isActionEnabled(match, "BUILD_ROAD") ? (
                  <PlacementSelect title="Build Road" ids={candidates.road} value={selectedRoad} onChange={setSelectedRoad} onSubmit={() => {
                    if (selectedRoad) {
                      void submit(client, match, "BUILD_ROAD", { edgeId: selectedRoad });
                    }
                  }} />
                ) : null}
                {isActionEnabled(match, "BUILD_SETTLEMENT") ? (
                  <PlacementSelect title="Build Settlement" ids={candidates.settlement} value={selectedSettlement} onChange={setSelectedSettlement} onSubmit={() => {
                    if (selectedSettlement) {
                      void submit(client, match, "BUILD_SETTLEMENT", { intersectionId: selectedSettlement });
                    }
                  }} />
                ) : null}
                {isActionEnabled(match, "UPGRADE_CITY") ? (
                  <PlacementSelect title="Upgrade City" ids={candidates.city} value={selectedCity} onChange={setSelectedCity} onSubmit={() => {
                    if (selectedCity) {
                      void submit(client, match, "UPGRADE_CITY", { intersectionId: selectedCity });
                    }
                  }} />
                ) : null}
                {match.requiredAction === "STEAL_RESOURCE" ? (
                  <PlacementGroup title="Steal Target" ids={match.stealablePlayerIds ?? []} onChoose={(victimPlayerId) => void submit(client, match, "STEAL_RESOURCE", { victimPlayerId })} />
                ) : null}
                {match.requiredAction === "PICK_YEAR_OF_PLENTY_RESOURCE" ? (
                  <ResourcePicker title="Year of Plenty" onPick={(resourceType) => void submit(client, match, "PICK_YEAR_OF_PLENTY_RESOURCE", { resourceType })} />
                ) : null}
                {match.requiredAction === "PICK_MONOPOLY_RESOURCE_TYPE" ? (
                  <ResourcePicker title="Monopoly" onPick={(resourceType) => void submit(client, match, "PICK_MONOPOLY_RESOURCE_TYPE", { resourceType })} />
                ) : null}
              </div>
            </div>
          </div>

          <div className="panel p-6">
            <p className="eyebrow">Trade and Recovery</p>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <ResourceComposer
                title="Trade Offer"
                left={tradeGive}
                right={tradeWant}
                enabled={isActionEnabled(match, "OFFER_TRADE")}
                setLeft={setTradeGive}
                setRight={setTradeWant}
                leftLabel="Ich gebe"
                rightLabel="Ich will"
                onSubmit={() => void submit(client, match, "OFFER_TRADE", { offeredResources: tradeGive, requestedResources: tradeWant })}
              />
              <ResourceComposer
                title="Bank / Harbor"
                left={bankGive}
                right={bankWant}
                enabled={isActionEnabled(match, "TRADE_WITH_BANK")}
                setLeft={setBankGive}
                setRight={setBankWant}
                leftLabel="Give"
                rightLabel="Receive"
                onSubmit={() => void submit(client, match, "TRADE_WITH_BANK", { giveResources: bankGive, receiveResources: bankWant })}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {match.requiredAction === "RESPOND_TRADE" ? (
                <>
                  <button className="action-button" onClick={() => void submit(client, match, "RESPOND_TRADE", { tradeId: match.tradeOffer?.tradeId, response: "accept" })}>
                    Trade annehmen
                  </button>
                  <button className="action-button secondary-button" onClick={() => void submit(client, match, "RESPOND_TRADE", { tradeId: match.tradeOffer?.tradeId, response: "reject" })}>
                    Trade ablehnen
                  </button>
                </>
              ) : null}
              {isActionEnabled(match, "CONFIRM_TRADE") ? (
                <button className="action-button" onClick={() => void submit(client, match, "CONFIRM_TRADE", { tradeId: match.tradeOffer?.tradeId, counterpartyPlayerId: match.tradeOffer?.acceptedPlayerIds[0] })}>
                  Trade bestaetigen
                </button>
              ) : null}
              {isActionEnabled(match, "CANCEL_TRADE") ? (
                <button className="action-button secondary-button" onClick={() => void submit(client, match, "CANCEL_TRADE", { tradeId: match.tradeOffer?.tradeId })}>
                  Trade abbrechen
                </button>
              ) : null}
              <button className="action-button secondary-button" onClick={() => void client.advanceSandbox()}>
                Opponents vorziehen
              </button>
              <button className="action-button secondary-button" onClick={() => void client.reattachSession()}>
                Snapshot reattach
              </button>
            </div>

            {snapshot.lastRejected ? (
              <div className="mt-5 rounded-[18px] border border-[rgba(185,91,80,0.35)] bg-[rgba(185,91,80,0.12)] p-4 text-sm leading-6 text-[#ffd8d4]">
                <strong>{snapshot.lastRejected.reasonCode}</strong>: {snapshot.lastRejected.message}
                {snapshot.lastRejected.currentRelevantVersion ? ` (aktueller Match-Stand ${snapshot.lastRejected.currentRelevantVersion})` : ""}
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-6">
          <div className="panel p-6">
            <p className="eyebrow">Public Badges</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="badge">Longest Road: {match.longestRoadHolderPlayerId ?? "vacant"} · {match.longestRoadLength ?? 0}</span>
              <span className="badge">Largest Army: {match.largestArmyHolderPlayerId ?? "vacant"} · {match.largestArmySize ?? 0}</span>
            </div>
          </div>

          <div className="panel p-6">
            <p className="eyebrow">Event Log</p>
            <div className="mt-4 grid gap-3">
              {snapshot.eventLog.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">Noch keine transportseitigen Events fuer diese Session.</p>
              ) : (
                snapshot.eventLog.slice().reverse().map((message, index) => (
                  <div key={`${message.type}-${index}`} className="inlay flex items-start gap-3 p-3">
                    <AssetToken
                      asset={
                        message.type === "server.command_accepted"
                          ? "log_build"
                          : message.type === "server.command_rejected"
                            ? "state_forced_action"
                            : message.type === "server.lifecycle_transition"
                              ? "log_victory"
                              : message.type === "server.match_snapshot"
                                ? "log_dice_roll"
                                : "log_trade_offer"
                      }
                      tone="paper"
                      size="sm"
                    />
                    <p className="text-sm leading-6 text-[var(--text-muted)]">{summarizeLogEntry(message)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ActionButton({ title, enabled, onClick }: { title: string; enabled: boolean; onClick: () => void }) {
  return (
    <button className={`action-button ${enabled ? "" : "secondary-button"}`} disabled={!enabled} onClick={onClick}>
      {title}
    </button>
  );
}

function PlacementGroup({ title, ids, onChoose }: { title: string; ids: string[]; onChoose: (id: string) => void }) {
  return (
    <div className="inlay p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ids.map((id) => (
          <button key={id} className="secondary-button rounded-full border border-[var(--line)] px-3 py-1 text-xs tracking-[0.16em] text-[var(--text-strong)]" onClick={() => onChoose(id)}>
            {id}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlacementSelect({
  title,
  ids,
  value,
  onChange,
  onSubmit,
}: {
  title: string;
  ids: string[];
  value: string | undefined;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="inlay p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{title}</p>
      <select className="select-input mt-3" value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">Ziel waehlen</option>
        {ids.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
      <button className="action-button mt-3" onClick={onSubmit} disabled={!value}>
        {title}
      </button>
    </div>
  );
}

function ResourcePicker({ title, onPick }: { title: string; onPick: (resourceType: ResourceType) => void }) {
  return (
    <div className="inlay p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["wood", "brick", "sheep", "wheat", "ore"] as ResourceType[]).map((resourceType) => (
          <button key={resourceType} className="secondary-button rounded-full border border-[var(--line)] px-3 py-1 text-xs tracking-[0.16em] text-[var(--text-strong)]" onClick={() => onPick(resourceType)}>
            {resourceType}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResourceComposer({
  title,
  left,
  right,
  enabled,
  setLeft,
  setRight,
  leftLabel,
  rightLabel,
  onSubmit,
}: {
  title: string;
  left: ResourceCounts;
  right: ResourceCounts;
  enabled: boolean;
  setLeft: (next: ResourceCounts) => void;
  setRight: (next: ResourceCounts) => void;
  leftLabel: string;
  rightLabel: string;
  onSubmit: () => void;
}) {
  return (
    <div className="inlay p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{title}</p>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ResourceStepper title={leftLabel} resources={left} onChange={setLeft} />
        <ResourceStepper title={rightLabel} resources={right} onChange={setRight} />
      </div>
      <button className="action-button mt-4" disabled={!enabled} onClick={onSubmit}>
        {title}
      </button>
    </div>
  );
}

function ResourceStepper({
  title,
  resources,
  onChange,
}: {
  title: string;
  resources: ResourceCounts;
  onChange: (next: ResourceCounts) => void;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{title}</p>
      <div className="mt-3 grid gap-2">
        {resourceEntries(resources).map((resource) => (
          <div key={resource.type} className="card-surface flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-sm">{resource.label}</span>
            <div className="flex items-center gap-2">
              <button className="secondary-button rounded-full border border-[#baa17d] px-2 py-1 text-xs text-[#5f4529]" onClick={() => onChange(numberStep(resources, resource.type, -1))}>-</button>
              <span className="min-w-5 text-center text-sm">{resource.count}</span>
              <button className="secondary-button rounded-full border border-[#baa17d] px-2 py-1 text-xs text-[#5f4529]" onClick={() => onChange(numberStep(resources, resource.type, 1))}>+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
