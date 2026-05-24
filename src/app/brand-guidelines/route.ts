import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const BACK_STRIP = `
<div id="op-back-strip" style="
  position:fixed;top:0;left:0;right:0;z-index:9999;height:44px;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 20px;
  background:rgba(20,14,10,0.88);
  backdrop-filter:blur(8px);
  border-bottom:1px solid rgba(255,255,255,0.08);
  font-family:system-ui,sans-serif;font-size:13px;color:rgba(255,255,255,0.7);
">
  <a href="/dashboard" style="
    display:flex;align-items:center;gap:6px;
    color:rgba(255,255,255,0.6);text-decoration:none;
  ">
    ← Back to dashboard
  </a>
  <span style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">
    Brand Guidelines
  </span>
  <div style="width:140px"></div>
</div>
`;

export async function GET() {
  const htmlPath = path.join(process.cwd(), "public", "brand", "guidelines.html");
  let html = fs.readFileSync(htmlPath, "utf-8");

  // Inject the back-strip right after the opening <body> tag, and push body content down
  html = html.replace(/<body([^>]*)>/, (_m, attrs: string) => {
    const hasStyle = /style\s*=\s*["']/i.test(attrs);
    const newAttrs = hasStyle
      ? attrs.replace(/(style\s*=\s*["'])/, `$1padding-top:44px;`)
      : attrs + ` style="padding-top:44px;"`;
    return `<body${newAttrs}>${BACK_STRIP}`;
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
