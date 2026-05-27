import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// CSS scoping
// ---------------------------------------------------------------------------

function prefixSelectors(selectorText: string, scope: string): string {
  return selectorText
    .split(",")
    .map((sel) => {
      sel = sel.trim();
      if (!sel) return "";
      if (sel === "html" || sel === "html *") return ""; // discard
      if (sel === "body") return scope;
      if (sel.startsWith("body ")) return scope + " " + sel.slice(5);
      if (sel === ":root") return scope; // CSS vars scoped to container
      return scope + " " + sel;
    })
    .filter(Boolean)
    .join(", ");
}

function scopeCSS(css: string, scope: string): string {
  css = css.replace(/@charset\s+[^;]+;/g, "");

  const out: string[] = [];
  let i = 0;
  const n = css.length;

  function skipComment(): void {
    i += 2;
    while (i < n) {
      if (css[i - 1] === "*" && css[i] === "/") { i++; return; }
      i++;
    }
  }

  function skipBlock(): void {
    let depth = 0;
    while (i < n) {
      if (css[i] === "/" && css[i + 1] === "*") { skipComment(); continue; }
      if (css[i] === "{") depth++;
      else if (css[i] === "}") { depth--; if (depth === 0) { i++; return; } }
      i++;
    }
  }

  function skipWS(): void {
    while (i < n) {
      if (/\s/.test(css[i])) i++;
      else if (css[i] === "/" && css[i + 1] === "*") skipComment();
      else break;
    }
  }

  while (i < n) {
    skipWS();
    if (i >= n) break;

    if (css[i] === "@") {
      const atMatch = css.slice(i).match(/^@([\w-]+)/);
      const atName = atMatch?.[1] ?? "";

      if (atName === "import" || atName === "charset" || atName === "namespace") {
        const end = css.indexOf(";", i);
        i = end < 0 ? n : end + 1;
        continue;
      }

      if (atName === "media" || atName === "supports" || atName === "layer") {
        const headerEnd = css.indexOf("{", i);
        if (headerEnd === -1) { i = n; continue; }
        const atHeader = css.slice(i, headerEnd + 1);
        i = headerEnd + 1;
        let depth = 1;
        const innerStart = i;
        while (i < n && depth > 0) {
          if (css[i] === "/" && css[i + 1] === "*") { skipComment(); continue; }
          if (css[i] === "{") depth++;
          else if (css[i] === "}") depth--;
          i++;
        }
        const innerContent = css.slice(innerStart, i - 1);
        out.push(atHeader + scopeCSS(innerContent, scope) + "}");
        continue;
      }

      // Other @-rules (keep as-is): @font-face, @keyframes handled by caller
      const atStart = i;
      const nextBrace = css.indexOf("{", i);
      const nextSemi = css.indexOf(";", i);
      if (nextBrace !== -1 && (nextSemi === -1 || nextBrace < nextSemi)) {
        i = nextBrace;
        skipBlock();
        out.push(css.slice(atStart, i));
      } else {
        const end = nextSemi < 0 ? n : nextSemi + 1;
        out.push(css.slice(atStart, end));
        i = end;
      }
      continue;
    }

    // Regular selector rule
    const bracePos = css.indexOf("{", i);
    if (bracePos === -1) { i = n; continue; }

    const selectorText = css.slice(i, bracePos).trim();
    const prefixed = prefixSelectors(selectorText, scope);
    i = bracePos;
    const blockStart = i;
    skipBlock();
    const blockStr = css.slice(blockStart, i);

    if (prefixed) out.push(prefixed + " " + blockStr);
  }

  return out.join("\n");
}

/**
 * Main scoping entry point.
 * Pre-extracts @font-face and @keyframes blocks (must stay global),
 * scopes everything else, then re-inserts the preserved blocks.
 */
function scopeCSSRobust(css: string, scope: string): string {
  const preserved: string[] = [];

  const re = /@(?:font-face|-webkit-keyframes|keyframes)\s*[^{]*\{/g;
  const positions: Array<{ start: number; end: number; content: string }> = [];

  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const blockStart = m.index + m[0].length - 1;
    let depth = 1;
    let j = blockStart + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    positions.push({ start: m.index, end: j, content: css.slice(m.index, j) });
  }

  let processable = "";
  let cursor = 0;
  for (const pos of positions) {
    processable += css.slice(cursor, pos.start) + `/*PRESERVED${preserved.length}*/`;
    preserved.push(pos.content);
    cursor = pos.end;
  }
  processable += css.slice(cursor);

  let scoped = scopeCSS(processable, scope);

  for (let idx = 0; idx < preserved.length; idx++) {
    scoped = scoped.replace(`/*PRESERVED${idx}*/`, preserved[idx]);
  }

  return scoped;
}

// ---------------------------------------------------------------------------
// Page component (Server Component — runs at request/build time)
// ---------------------------------------------------------------------------

export default function BrandPage() {
  const htmlPath = path.join(process.cwd(), "public", "brand", "guidelines.html");
  const html = fs.readFileSync(htmlPath, "utf-8");

  // Collect all <style> blocks
  const styleContents: string[] = [];
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch: RegExpExecArray | null;
  while ((styleMatch = styleRe.exec(html)) !== null) {
    styleContents.push(styleMatch[1]);
  }
  const rawCSS = styleContents.join("\n");

  // Extract <body> content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : "";

  // Scope CSS and add app-shell overrides
  const scope = ".brand-doc";
  const scopedCSS =
    scopeCSSRobust(rawCSS, scope) +
    `\n/* ── App shell overrides ── */\n` +
    `.brand-doc .nav { display: none !important; }\n` +
    `.brand-doc { padding-left: 0 !important; }\n` +
    `.brand-doc .main { margin-left: 0 !important; }\n`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scopedCSS }} />
      <div
        className="brand-doc"
        dangerouslySetInnerHTML={{ __html: bodyContent }}
      />
    </>
  );
}
