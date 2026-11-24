"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createServer } = require("../server");

async function withServer(handler) {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await handler(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("serves the homepage from public/", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(await response.text(), /AWS Student Builder Group/i);
  });
});

test("preserves the admin dashboard shortcut", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/admin/dashboard`, { redirect: "manual" });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/admin/dashboard/dashboard.html");
  });
});

test("does not expose project-root private files", async () => {
  await withServer(async (base) => {
    for (const route of ["/server.js", "/package.json", "/README.md", "/infrastructure/lambda/admin-recovery/index.mjs"]) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 404, `${route} should not be public`);
    }
  });
});

test("rejects unsupported HTTP methods", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/`, { method: "POST" });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET, HEAD");
  });
});

test("admin portal checks for an existing Cognito administrator session", () => {
  const homepage = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
  const loginPage = fs.readFileSync(path.join(__dirname, "../public/admin/index.html"), "utf8");

  assert.match(homepage, /class="nav-login" href="\/admin\/"/);
  assert.match(homepage, /Admin portal/);
  assert.match(loginPage, /redirectIfAdministratorSessionExists/);
  assert.match(loginPage, /getCurrentUser\(\)/);
  assert.match(loginPage, /fetchAuthSession\(\)/);
  assert.match(loginPage, /groups\.includes\("Admins"\)/);
  assert.match(loginPage, /\/admin\/dashboard\/dashboard\.html/);
});
