import type { ReactNode } from "react";

export type AssetKey =
  | "resource_wood"
  | "resource_brick"
  | "resource_sheep"
  | "resource_wheat"
  | "resource_ore"
  | "piece_road"
  | "piece_settlement"
  | "piece_city"
  | "piece_robber"
  | "badge_longest_road"
  | "badge_largest_army"
  | "status_ready"
  | "status_not_ready"
  | "presence_connected"
  | "presence_disconnected"
  | "state_forced_action"
  | "state_waiting"
  | "log_dice_roll"
  | "log_build"
  | "log_trade_offer"
  | "log_victory";

const ASSET_GLYPHS: Record<AssetKey, string> = {
  resource_wood: "W",
  resource_brick: "B",
  resource_sheep: "S",
  resource_wheat: "G",
  resource_ore: "O",
  piece_road: "R",
  piece_settlement: "S",
  piece_city: "C",
  piece_robber: "X",
  badge_longest_road: "LR",
  badge_largest_army: "LA",
  status_ready: "RD",
  status_not_ready: "NR",
  presence_connected: "ON",
  presence_disconnected: "OFF",
  state_forced_action: "!",
  state_waiting: "…",
  log_dice_roll: "D",
  log_build: "B",
  log_trade_offer: "T",
  log_victory: "V",
};

export function AssetToken({
  asset,
  tone = "default",
  size = "md",
  children,
}: {
  asset: AssetKey;
  tone?: "default" | "wood" | "felt" | "paper" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
}) {
  const toneClass =
    tone === "wood"
      ? "bg-[rgba(201,146,88,0.22)] text-[#fff2da] border-[rgba(242,211,167,0.2)]"
      : tone === "felt"
        ? "bg-[rgba(144,175,124,0.18)] text-[#eff6e7] border-[rgba(173,211,150,0.2)]"
        : tone === "paper"
          ? "bg-[rgba(247,237,220,0.86)] text-[#3f2d1d] border-[rgba(74,53,27,0.08)]"
          : tone === "danger"
            ? "bg-[rgba(185,91,80,0.16)] text-[#ffd8d4] border-[rgba(185,91,80,0.25)]"
            : tone === "success"
              ? "bg-[rgba(111,156,120,0.18)] text-[#e6f2e3] border-[rgba(111,156,120,0.28)]"
              : "bg-[rgba(255,248,235,0.06)] text-[var(--text-strong)] border-[var(--line)]";
  const sizeClass = size === "sm" ? "h-8 w-8 text-[0.65rem]" : size === "lg" ? "h-14 w-14 text-sm" : "h-10 w-10 text-[0.72rem]";

  return (
    <span
      className={`inline-flex ${sizeClass} items-center justify-center rounded-full border font-semibold tracking-[0.16em] ${toneClass}`}
      aria-hidden="true"
    >
      {children ?? ASSET_GLYPHS[asset]}
    </span>
  );
}
