// Checks that every text/background token pair in app/globals.css meets WCAG AA
// in both themes. Run by CI (`pnpm check:contrast`). Add a pair here when a new
// token carries text.
import { readFileSync } from "node:fs";

const PAIRS: Array<[text: string, background: string]> = [
  ["ink", "page"],
  ["ink", "card"],
  ["ink", "sunk"],
  ["ink-2", "card"],
  ["ink-3", "card"],
  ["ink-3", "page"],
  ["accent", "card"],
  ["accent-ink", "accent"],
  ["accent", "accent-soft"],
  ["ok", "ok-soft"],
  ["warn", "warn-soft"],
  ["danger", "danger-soft"],
  ["danger", "card"],
];
const AA = 4.5;

const css = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

function block(selector: RegExp): Record<string, string> {
  const body = css.match(selector)?.[1] ?? "";
  return Object.fromEntries(
    [...body.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [
      m[1]!,
      m[2]!,
    ]),
  );
}

const light = block(/@theme\s*{([^}]*)}/);
const dark = { ...light, ...block(/:root\[data-theme="dark"\]\s*{([^}]*)}/) };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

let failed = 0;
for (const [name, tokens] of [
  ["light", light],
  ["dark", dark],
] as const) {
  for (const [text, bg] of PAIRS) {
    const t = tokens[text];
    const b = tokens[bg];
    if (!t || !b) {
      console.error(`${name}: missing token ${!t ? text : bg}`);
      failed++;
      continue;
    }
    const r = ratio(t, b);
    if (r < AA) {
      console.error(
        `${name}: ${text} on ${bg} is ${r.toFixed(2)}:1 (needs ${AA}:1)`,
      );
      failed++;
    }
  }
}

if (failed) process.exit(1);
console.log(`Contrast OK: ${PAIRS.length} pairs in light and dark.`);
