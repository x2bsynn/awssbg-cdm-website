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


test("Admin Portal dependencies are bundled locally and preloaded", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
  const buildScript = fs.readFileSync(path.join(__dirname, "../scripts/build-admin.js"), "utf8");
  const amplifySource = fs.readFileSync(path.join(__dirname, "../src/admin/amplify.js"), "utf8");
  const oidcSource = fs.readFileSync(path.join(__dirname, "../src/admin/auth.js"), "utf8");
  const loginPage = fs.readFileSync(path.join(__dirname, "../public/admin/index.html"), "utf8");
  const callbackPage = fs.readFileSync(path.join(__dirname, "../public/admin/callback.html"), "utf8");
  const dashboardPage = fs.readFileSync(path.join(__dirname, "../public/admin/dashboard/dashboard.html"), "utf8");

  assert.ok(packageJson.dependencies["aws-amplify"]);
  assert.ok(packageJson.dependencies["oidc-client-ts"]);
  assert.ok(packageJson.devDependencies.esbuild);
  assert.match(buildScript, /bundle:\s*true/);
  assert.match(buildScript, /platform:\s*["']browser["']/);
  assert.match(amplifySource, /from ["']aws-amplify["']/);
  assert.match(amplifySource, /from ["']aws-amplify\/auth["']/);
  for (const authMethod of ["signIn", "confirmSignIn", "signOut", "fetchAuthSession", "getCurrentUser", "resetPassword", "confirmResetPassword"]) {
    assert.match(amplifySource, new RegExp(`\\b${authMethod}\\b`));
  }
  assert.match(amplifySource, /userPoolId: ["']us-east-1_Z8XPiGmrk["']/);
  assert.match(amplifySource, /userPoolClientId: ["']7l1jvkjda7pql65kla7kqv4kon["']/);
  assert.match(oidcSource, /from ["']oidc-client-ts["']/);
  assert.doesNotMatch(amplifySource + oidcSource, /https:\/\/esm\.sh/);
  assert.match(loginPage, /rel="modulepreload" href="\.\/amplify\.js"/);
  assert.match(loginPage, /id="status"[^>]*>Checking your administrator session/);
  assert.match(loginPage, /id="login-form" hidden/);
  assert.match(callbackPage, /rel="modulepreload" href="\.\/auth\.js"/);
  assert.match(dashboardPage, /rel="modulepreload" href="\.\.\/amplify\.js"/);
});
