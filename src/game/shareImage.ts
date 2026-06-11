// Generates a shareable PNG score card on a <canvas>. Best-effort:
// returns null if the canvas or sprite loading fails, so callers can
// fall back to text sharing.

import { getPokemonById } from "./data";
import { TYPE_COLORS } from "./typeColors";

export interface CardOptions {
  tier: string;
  total: number;
  teamIds: number[];
  rank?: number;
  count?: number;
}

const W = 1200;
const H = 630;

export async function generateShareImage(opts: CardOptions): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1b2140");
  bg.addColorStop(1, "#0f1220");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffd76a";
  ctx.font = "bold 52px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("PokéDraft", 60, 96);

  ctx.textAlign = "right";
  ctx.fillStyle = "#9aa2c4";
  ctx.font = "500 26px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("Build the ultimate team", W - 60, 92);

  // Tier + score
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 88px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(opts.tier, W / 2, 210);

  ctx.fillStyle = "#4ade80";
  ctx.font = "bold 44px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(`${opts.total} / 100`, W / 2, 268);

  // Team sprites
  const team = opts.teamIds
    .map(getPokemonById)
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const sprites = await Promise.all(team.map((p) => loadImage(p.sprite)));

  const boxW = 160;
  const gap = 18;
  const rowW = team.length * boxW + (team.length - 1) * gap;
  const startX = (W - rowW) / 2;
  const boxY = 320;
  const boxH = 180;

  team.forEach((p, i) => {
    const x = startX + i * (boxW + gap);
    const color = TYPE_COLORS[p.types[0]];
    roundRect(ctx, x, boxY, boxW, boxH, 18);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.stroke();

    const img = sprites[i];
    if (img) {
      const pad = 16;
      drawContain(ctx, img, x + pad, boxY + pad, boxW - pad * 2, boxH - pad * 2 - 22);
    }
    ctx.fillStyle = "#eef1ff";
    ctx.textAlign = "center";
    ctx.font = "600 18px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(truncate(p.name, 12), x + boxW / 2, boxY + boxH - 14);
  });

  // Rank + URL
  ctx.textAlign = "center";
  if (opts.rank && opts.count) {
    ctx.fillStyle = "#ffd76a";
    ctx.font = "bold 34px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(
      `Rank #${opts.rank.toLocaleString()} of ${opts.count.toLocaleString()}`,
      W / 2,
      560,
    );
  }
  ctx.fillStyle = "#9aa2c4";
  ctx.font = "500 24px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("pokedraft-lyart.vercel.app", W / 2, opts.rank ? 600 : 575);

  return await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), "image/png");
    } catch {
      resolve(null);
    }
  });
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

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
