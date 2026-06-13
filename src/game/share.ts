// Builds the shareable result text and handles copy / native-share.

export interface ShareData {
  tier: string;
  total: number;
  strengthPts: number;
  defensePts: number;
  coveragePts: number;
  percentile?: number;
  rank24h?: number;
  typeEmojis: string[];
  url: string;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function buildShareText(d: ShareData): string {
  const lines = [
    `PokéDraft — ${d.tier} (${d.total}/100)`,
    d.typeEmojis.join(" "),
    `💪 ${d.strengthPts}  🛡️ ${d.defensePts}  ⚔️ ${d.coveragePts}`,
  ];
  if (d.percentile != null && d.rank24h != null) {
    lines.push(`🏆 ${ordinal(d.percentile)} percentile · #${d.rank24h.toLocaleString()} in the last 24h`);
  }
  lines.push(d.url);
  return lines.join("\n");
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers / contexts without the async clipboard API.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// Returns true if the native share sheet handled it; false if unsupported/cancelled.
export async function nativeShare(text: string, file?: File): Promise<boolean> {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: { text?: string; files?: File[] }) => Promise<void>;
  };
  try {
    if (file && nav.canShare?.({ files: [file] } as unknown as ShareData)) {
      await nav.share!({ text, files: [file] });
      return true;
    }
    if (nav.share) {
      await nav.share({ text });
      return true;
    }
  } catch {
    /* cancelled or unsupported */
  }
  return false;
}
