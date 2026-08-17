import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("build contains the shared inventory application", async () => {
  await access(new URL("../dist/server/index.js", import.meta.url));
  const [page, app, route, hosting] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/inventory-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/inventory/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);
  assert.match(page, /InventoryApp/);
  assert.match(app, /Ortak Envanter/);
  assert.match(route, /CREATE TABLE IF NOT EXISTS items/);
  assert.match(hosting, /"d1": "DB"/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
});
