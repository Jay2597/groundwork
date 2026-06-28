// Safe arithmetic evaluator for number inputs: lets users type "100/2", "8*3",
// "120 + 16" etc. Recursive-descent (no eval) over + - * / and parentheses.

type Tok = { t: "num"; v: number } | { t: "op"; v: string } | { t: "lp" } | { t: "rp" };

function tokenize(input: string): Tok[] | null {
  const tokens: Tok[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === " ") {
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ t: "lp" });
      i++;
    } else if (ch === ")") {
      tokens.push({ t: "rp" });
      i++;
    } else if ("+-*/".includes(ch)) {
      tokens.push({ t: "op", v: ch });
      i++;
    } else if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < input.length && /[0-9.]/.test(input[i])) num += input[i++];
      const v = Number(num);
      if (Number.isNaN(v)) return null;
      tokens.push({ t: "num", v });
    } else {
      return null; // unsupported character
    }
  }
  return tokens;
}

/**
 * Evaluate an arithmetic expression. Returns null when the input isn't a valid
 * expression (callers keep the previous value in that case).
 */
export function evalMath(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const parsed = tokenize(trimmed);
  if (!parsed || parsed.length === 0) return null;
  const tokens: Tok[] = parsed;

  let pos = 0;
  const peek = () => tokens[pos];

  function parseAddSub(): number | null {
    let left = parseTerm();
    if (left === null) return null;
    while (peek()?.t === "op" && ((peek() as { v: string }).v === "+" || (peek() as { v: string }).v === "-")) {
      const op = (tokens[pos] as { v: string }).v;
      pos++;
      const right = parseTerm();
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number | null {
    let left = parseFactor();
    if (left === null) return null;
    while (peek()?.t === "op" && ((peek() as { v: string }).v === "*" || (peek() as { v: string }).v === "/")) {
      const op = (tokens[pos] as { v: string }).v;
      pos++;
      const right = parseFactor();
      if (right === null) return null;
      if (op === "/" && right === 0) return null;
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  function parseFactor(): number | null {
    const tok = peek();
    if (!tok) return null;
    if (tok.t === "op" && tok.v === "-") {
      pos++;
      const f = parseFactor();
      return f === null ? null : -f;
    }
    if (tok.t === "op" && tok.v === "+") {
      pos++;
      return parseFactor();
    }
    if (tok.t === "num") {
      pos++;
      return tok.v;
    }
    if (tok.t === "lp") {
      pos++;
      const e = parseAddSub();
      if (e === null || peek()?.t !== "rp") return null;
      pos++;
      return e;
    }
    return null;
  }

  const result = parseAddSub();
  if (result === null || pos !== tokens.length) return null;
  return Number.isFinite(result) ? Math.round(result * 1000) / 1000 : null;
}
