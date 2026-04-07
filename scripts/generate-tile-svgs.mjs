import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const nodeCli = path.join(repoRoot, "node_modules", "imagetracerjs", "nodecli", "nodecli.js");
const tilesDir = path.join(repoRoot, "apps", "web", "public", "tiles");

const tileNames = ["wood", "brick", "sheep", "wheat", "ore", "desert"];

mkdirSync(tilesDir, { recursive: true });

const traceArgs = [
  "ltres",
  "2",
  "qtres",
  "2",
  "pathomit",
  "60",
  "numberofcolors",
  "12",
  "blurradius",
  "2",
  "blurdelta",
  "32",
  "scale",
  "1",
  "linefilter",
  "true",
];

for (const tileName of tileNames) {
  const input = path.join(tilesDir, `${tileName}.png`);
  const output = path.join(tilesDir, `${tileName}.svg`);

  execFileSync("node", [nodeCli, input, "outfilename", output, ...traceArgs], {
    cwd: repoRoot,
    stdio: "inherit",
  });
}
