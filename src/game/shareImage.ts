// Generates the shareable PokéDraft scorecard PNG on a <canvas>, styled after
// the SixRings card. Best-effort: returns null if canvas/sprites fail so callers
// can fall back to text sharing.

import { TYPE_COLORS, typeLabel } from "./typeColors";
import type { Pokemon } from "./types";
import { ordinal } from "./share";

export interface CardOptions {
  tier: string;
  total: number;
  percentile?: number;
  rank24h?: number;
  name?: string;
  team: Pokemon[];
  strengthPts: number;
  defensePts: number;
  coveragePts: number;
}

const W = 1080;
const H = 1560;
const PAD = 56;
const FONT = '"Arial", "Segoe UI", system-ui, sans-serif';

const GOLD = "#f3c14b";
const INK = "#0c0d13";
const PANEL = "#14151e";
const TEXT = "#f5f5fb";
const MUTED = "#8c91a6";
const LINE = "rgba(243, 193, 75, 0.18)";

export async function generateShareImage(opts: CardOptions): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background + gold frame
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#16131a");
  bg.addColorStop(0.5, INK);
  bg.addColorStop(1, "#0a0b10");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, 14, 14, W - 28, H - 28, 28);
  ctx.strokeStyle = "rgba(243, 193, 75, 0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // --- Header ---
  center(ctx);
  ctx.fillStyle = GOLD;
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText("I DRAFTED A", W / 2, 92);

  const title = `${opts.tier.toUpperCase()} TEAM`;
  const titleSize = fitFont(ctx, title, W - 2 * PAD, 78, "800");
  ctx.font = `800 ${titleSize}px ${FONT}`;
  ctx.fillStyle = GOLD;
  ctx.fillText(title, W / 2, 168);

  const named = opts.name && opts.name !== "Anonymous";
  if (named) {
    ctx.fillStyle = MUTED;
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText(`by ${opts.name}`, W / 2, 210);
  }

  // --- Six pokéballs ---
  const ballR = 21;
  const ballGap = 22;
  const ballRow = 6 * (ballR * 2) + 5 * ballGap;
  let bx = (W - ballRow) / 2 + ballR;
  for (let i = 0; i < 6; i++) {
    drawPokeball(ctx, bx, 258, ballR, i < opts.team.length);
    bx += ballR * 2 + ballGap;
  }

  // --- Stat boxes: PERCENTILE / SCORE / RANK PAST 24H ---
  const boxY = 300;
  const boxH = 124;
  const boxGap = 16;
  const boxW = (W - 2 * PAD - 2 * boxGap) / 3;
  const pct = opts.percentile != null ? ordinal(opts.percentile).toUpperCase() : "—";
  const rank = opts.rank24h != null ? `#${opts.rank24h.toLocaleString()}` : "—";
  statBox(ctx, PAD, boxY, boxW, boxH, "PERCENTILE", pct);
  statBox(ctx, PAD + boxW + boxGap, boxY, boxW, boxH, "SCORE", `${opts.total}`);
  statBox(ctx, PAD + 2 * (boxW + boxGap), boxY, boxW, boxH, "RANK PAST 24H", rank);

  // --- Pokémon rows ---
  const sprites = await Promise.all(opts.team.map((p) => loadImage(p.sprite)));
  const rowTop0 = 466;
  const rowH = 132;
  opts.team.forEach((p, i) => {
    drawRow(ctx, rowTop0 + i * rowH, rowH, i + 1, p, sprites[i]);
  });

  // --- Breakdown: STRENGTH / SYNERGY / COVERAGE ---
  const brkY = rowTop0 + 6 * rowH + 16;
  const brkH = 104;
  statBox(ctx, PAD, brkY, boxW, brkH, "STRENGTH", `+${opts.strengthPts}`, 40);
  statBox(ctx, PAD + boxW + boxGap, brkY, boxW, brkH, "SYNERGY", `+${opts.defensePts}`, 40);
  statBox(ctx, PAD + 2 * (boxW + boxGap), brkY, boxW, brkH, "COVERAGE", `+${opts.coveragePts}`, 40);

  // --- Total ---
  const totY = brkY + brkH + 16;
  roundRect(ctx, PAD, totY, W - 2 * PAD, 76, 16);
  ctx.fillStyle = "rgba(243, 193, 75, 0.10)";
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = MUTED;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText("TOTAL SCORE", PAD + 28, totY + 40);
  ctx.textAlign = "right";
  ctx.fillStyle = GOLD;
  ctx.font = `800 48px ${FONT}`;
  ctx.fillText(`${opts.total} / 100`, W - PAD - 28, totY + 40);

  // --- Footer ---
  center(ctx);
  ctx.fillStyle = GOLD;
  ctx.font = `800 28px ${FONT}`;
  ctx.fillText("POKEDRAFT-LYART.VERCEL.APP", W / 2, H - 52);

  return await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), "image/png");
    } catch {
      resolve(null);
    }
  });
}

// --- drawing helpers ------------------------------------------------------

function drawRow(
  ctx: CanvasRenderingContext2D,
  top: number,
  h: number,
  pick: number,
  p: Pokemon,
  sprite: HTMLImageElement | null,
) {
  const midY = top + h / 2;

  // pick number + primary type
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = GOLD;
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText(`${pick}`, PAD + 4, midY - 4);
  ctx.fillStyle = MUTED;
  ctx.font = `700 16px ${FONT}`;
  ctx.fillText(typeLabel(p.types[0]).toUpperCase(), PAD + 4, midY + 24);

  // sprite
  const spriteX = PAD + 78;
  if (sprite) drawContain(ctx, sprite, spriteX, midY - 52, 104, 104);

  // name + type badges
  const nameX = PAD + 200;
  ctx.fillStyle = TEXT;
  ctx.font = `800 33px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(truncate(ctx, p.name, 360), nameX, midY - 2);
  let badgeX = nameX;
  for (const t of p.types) badgeX += drawTypeBadge(ctx, badgeX, midY + 14, t) + 8;

  // OFF / DEF / BST
  const off = p.stats.attack + p.stats.spAtk + p.stats.speed;
  const def = p.stats.hp + p.stats.defense + p.stats.spDef;
  miniStat(ctx, W - PAD - 360, midY, "OFF", `${off}`);
  miniStat(ctx, W - PAD - 230, midY, "DEF", `${def}`);

  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = MUTED;
  ctx.font = `700 15px ${FONT}`;
  ctx.fillText("BST", W - PAD - 4, midY - 18);
  ctx.fillStyle = GOLD;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText(`${p.bst}`, W - PAD - 4, midY + 18);

  // divider
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, top + h);
  ctx.lineTo(W - PAD, top + h);
  ctx.stroke();
}

function miniStat(ctx: CanvasRenderingContext2D, cx: number, midY: number, label: string, value: string) {
  center(ctx);
  ctx.fillStyle = MUTED;
  ctx.font = `700 15px ${FONT}`;
  ctx.fillText(label, cx, midY - 16);
  ctx.fillStyle = TEXT;
  ctx.font = `700 27px ${FONT}`;
  ctx.fillText(value, cx, midY + 14);
}

function statBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  valueSize = 46,
) {
  roundRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = PANEL;
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  center(ctx);
  ctx.fillStyle = MUTED;
  ctx.font = `700 19px ${FONT}`;
  ctx.fillText(label, x + w / 2, y + 38);
  const size = fitFont(ctx, value, w - 24, valueSize, "800");
  ctx.font = `800 ${size}px ${FONT}`;
  ctx.fillStyle = GOLD;
  ctx.fillText(value, x + w / 2, y + h - 34);
}

function drawTypeBadge(ctx: CanvasRenderingContext2D, x: number, y: number, type: Pokemon["types"][number]): number {
  const label = typeLabel(type).toUpperCase();
  ctx.font = `800 15px ${FONT}`;
  const w = ctx.measureText(label).width + 20;
  const h = 25;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = TYPE_COLORS[type];
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 10, y + h / 2 + 1);
  return w;
}

function drawPokeball(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, filled: boolean) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#15161e";
  ctx.fill();
  // top half
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.fillStyle = filled ? GOLD : "#2a2c39";
  ctx.fill();
  // outline + equator
  ctx.strokeStyle = filled ? GOLD : "#3a3d4d";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.stroke();
  // center button
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = "#15161e";
  ctx.fill();
  ctx.strokeStyle = filled ? GOLD : "#3a3d4d";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, base: number, weight: string): number {
  let size = base;
  ctx.font = `${weight} ${size}px ${FONT}`;
  while (ctx.measureText(text).width > maxW && size > 18) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${FONT}`;
  }
  return size;
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s + "…";
}

function center(ctx: CanvasRenderingContext2D) {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
