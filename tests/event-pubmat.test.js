const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
test("pubmat ratio accepts exact landscape 16:9 and rejects invalid dimensions", async () => {
  const js = fs.readFileSync(
    path.join(__dirname, "../public/admin/dashboard/event-pubmat.js"),
    "utf8",
  );
  const { isLandscape16x9 } = await import(
    "data:text/javascript;base64," + Buffer.from(js).toString("base64")
  );
  for (const [w, h] of [
    [1920, 1080],
    [1280, 720],
    [3840, 2160],
  ])
    assert.equal(isLandscape16x9(w, h), true);
  for (const [w, h] of [
    [1080, 1920],
    [1080, 1080],
    [1920, 1079],
    [0, 0],
    [-16, -9],
    [Infinity, 9],
  ])
    assert.equal(isLandscape16x9(w, h), false);
});
