"use strict";

const path = require("node:path");
const esbuild = require("esbuild");

const projectRoot = path.resolve(__dirname, "..");

async function buildAdminBundles() {
  await esbuild.build({
    absWorkingDir: projectRoot,
    entryPoints: {
      amplify: "src/admin/amplify.js",
      auth: "src/admin/auth.js",
    },
    outdir: "public/admin",
    entryNames: "[name]",
    bundle: true,
    minify: true,
    treeShaking: true,
    format: "esm",
    platform: "browser",
    target: ["es2020"],
    legalComments: "none",
    sourcemap: false,
    logLevel: "info",
  });

  console.log("Built local AWS Amplify and Cognito OIDC browser bundles.");
}

buildAdminBundles().catch((error) => {
  console.error("Unable to build Admin Portal bundles:", error);
  process.exitCode = 1;
});
