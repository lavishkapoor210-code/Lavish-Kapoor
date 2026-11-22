/**
 * Guards the rule "never silently change the astrologer's script":
 * every scene's narration must appear word-for-word, in order, in the script.
 */

export interface SceneCheck {
  number: number;
  inScript: boolean;
  estimatedSec: number;
  warnings: string[];
}

export interface NarrationReport {
  scenes: SceneCheck[];
  coverage: number; // share of the script's spoken words used by the scenes, 0..1
  errors: string[];
  warnings: string[];
}

/** Drop scene markers like "[दृश्य 1]" / "[Scene 2]" and normalise spacing + dashes. */
export function normalise(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\[[^\]]{0,40}\]/g, " ")
    .replace(/[–—]/g, "—")
    .replace(/\s+/g, " ")
    .trim();
}

const words = (t: string) => normalise(t).split(" ").filter(Boolean);

/** Conversational Hindi ≈ 2.5 words/s plus a short breath. */
export function estimateSpeechSec(narration: string): number {
  return Math.round((words(narration).length / 2.5 + 0.5) * 10) / 10;
}

export function checkNarration(
  script: string,
  scenes: { number: number; narration: string; durationSec?: number; shotType?: string; audioSource?: string }[],
  opts: { flowClipMaxSec?: number } = {},
): NarrationReport {
  const flowMax = opts.flowClipMaxSec ?? 8;
  const src = normalise(script);
  const errors: string[] = [];
  const warnings: string[] = [];
  let cursor = 0;
  let used = 0;

  const checks = scenes.map((s) => {
    const n = normalise(s.narration);
    const w: string[] = [];
    let inScript = false;
    if (!n) {
      w.push("empty narration");
    } else {
      const at = src.indexOf(n, cursor);
      if (at >= 0) {
        inScript = true;
        cursor = at + n.length;
        used += words(n).length;
      } else if (src.includes(n)) {
        w.push("narration is in the script but out of order");
      } else {
        w.push("narration differs from the script");
      }
    }
    const est = estimateSpeechSec(s.narration);
    if (s.audioSource === "flow" && est > flowMax) {
      w.push(`~${est}s of speech is longer than one ${flowMax}s Flow clip — split the scene or shorten the line in the script`);
    }
    if (s.durationSec && est > s.durationSec + 0.5) w.push(`planned ${s.durationSec}s is shorter than the ~${est}s needed to speak it`);
    return { number: s.number, inScript, estimatedSec: est, warnings: w };
  });

  for (const c of checks) if (!c.inScript) errors.push(`Scene ${c.number}: ${c.warnings[0]}`);
  const total = words(src).length || 1;
  const coverage = Math.min(1, used / total);
  if (coverage < 0.97) warnings.push(`Scenes cover ${Math.round(coverage * 100)}% of the script's words — part of the script has no scene.`);
  for (const c of checks) for (const w of c.warnings.slice(c.inScript ? 0 : 1)) warnings.push(`Scene ${c.number}: ${w}`);
  return { scenes: checks, coverage, errors, warnings };
}
