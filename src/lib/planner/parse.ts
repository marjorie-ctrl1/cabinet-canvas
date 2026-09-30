export type ParsedItem = { name: string; w: number; d: number; h: number; quantity: number };

const NUM = "(\\d+(?:[.,]\\d+)?)";
const toNum = (s: string) => Number(s.replace(",", "."));

function labelled(line: string, keys: string[]): number | null {
  for (const k of keys) {
    const m = line.match(new RegExp(`(?:^|[^a-z])${k}\\s*[:=]?\\s*${NUM}`, "i"));
    if (m?.[1]) return toNum(m[1]);
  }
  return null;
}

/** Parse free-form text (one object per line) into sized items, in cm. */
export function parseDimensions(text: string, fallbackName: string): ParsedItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // table header like "Name  Width  Depth  Height" → column order
  let order: ("w" | "d" | "h")[] = ["w", "d", "h"];
  const out: ParsedItem[] = [];
  for (const line of lines) {
    const low = line.toLowerCase();
    if (!/\d/.test(line)) {
      const cols = low.split(/[\t,;|]+|\s{2,}|\s+/);
      const o = cols
        .map((c) => (/^w/.test(c) ? "w" : /^(d|l)/.test(c) ? "d" : /^h/.test(c) ? "h" : null))
        .filter(Boolean) as ("w" | "d" | "h")[];
      if (o.length === 3) order = o;
      continue;
    }
    const qm = line.match(/(?:qty|quantity|x)\s*[:=]?\s*(\d+)\s*$|(\d+)\s*(?:pcs|pieces|stk)/i);
    let quantity = 1;
    let rest = line;
    let w = labelled(line, ["width", "w", "b"]);
    let d = labelled(line, ["depth", "length", "d", "l", "t"]);
    let h = labelled(line, ["height", "h"]);
    if (w == null || d == null || h == null) {
      if (qm) {
        quantity = Number(qm[1] ?? qm[2]);
        rest = line.replace(qm[0], " ");
      }
      const x = rest.match(new RegExp(`${NUM}\\s*[x×*]\\s*${NUM}\\s*[x×*]\\s*${NUM}`, "i"));
      let nums: number[];
      if (x) nums = [toNum(x[1]!), toNum(x[2]!), toNum(x[3]!)];
      else {
        const all = [...rest.matchAll(new RegExp(NUM, "g"))].map((m) => toNum(m[1]!));
        nums = all.slice(-3);
      }
      if (nums.length < 3) continue;
      const v = { [order[0]!]: nums[0], [order[1]!]: nums[1], [order[2]!]: nums[2] } as { w: number; d: number; h: number };
      w = w ?? v.w;
      d = d ?? v.d;
      h = h ?? v.h;
    } else if (qm) {
      quantity = Number(qm[1] ?? qm[2]);
    }
    const mm = /\bmm\b/i.test(line) ? 0.1 : /\bm\b/i.test(line) && !/cm/i.test(line) ? 100 : 1;
    let name = "";
    const colon = line.indexOf(":");
    if (colon > 0 && !/\d\s*$/.test(line.slice(0, colon)) ) name = line.slice(0, colon);
    else name = line.split(/[\t,;|]|\s{2,}|\s(?=[whd]\s*\d)|\s(?=\d)/i)[0] ?? "";
    name = name.replace(/^[-*•\d.)\s]+/, "").trim();
    out.push({
      name: name || `${fallbackName} ${out.length + 1}`,
      w: Math.round(w * mm * 10) / 10,
      d: Math.round(d * mm * 10) / 10,
      h: Math.round(h * mm * 10) / 10,
      quantity: Math.max(1, quantity || 1),
    });
  }
  return out;
}
