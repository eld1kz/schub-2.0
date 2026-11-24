// Serves the sample event pages in this folder for "Fill from link" in the e2e tests (playwright.config.ts). dev:local
// reads pages from here only, through LINK_PREVIEW_FIXTURES (scripts/db-local.sh and fillFromLink in actions.ts).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const port = Number(process.env.FIXTURES_PORT ?? 3102);
const pages = new Set(["/event.html", "/no-event.html"]);

createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  if (!pages.has(path)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(await readFile(new URL(`.${path}`, import.meta.url)));
}).listen(port, "localhost");
