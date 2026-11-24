"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PUBLIC_ROOT = path.join(__dirname, "public");
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function createServer({ publicRoot = PUBLIC_ROOT } = {}) {
  const resolvedPublicRoot = path.resolve(publicRoot);

  return http.createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("Method not allowed");
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    } catch {
      response.writeHead(400);
      response.end("Bad request");
      return;
    }

    if (["/admin/dashboard", "/admin/dashboard/", "/admin/dashboard.html"].includes(pathname)) {
      response.writeHead(302, { Location: "/admin/dashboard/dashboard.html" });
      response.end();
      return;
    }

    // Hidden files and directories are never part of the public website.
    if (pathname.split("/").some((segment) => segment.startsWith("."))) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    let filePath = path.resolve(resolvedPublicRoot, relativePath);
    if (filePath !== resolvedPublicRoot && !filePath.startsWith(`${resolvedPublicRoot}${path.sep}`)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    try {
      const publicRealPath = await fs.promises.realpath(resolvedPublicRoot);
      let fileRealPath = await fs.promises.realpath(filePath);
      let stats = await fs.promises.stat(fileRealPath);

      if (stats.isDirectory()) {
        fileRealPath = await fs.promises.realpath(path.join(fileRealPath, "index.html"));
        stats = await fs.promises.stat(fileRealPath);
      }

      // Prevent symlinks inside public/ from exposing files outside public/.
      if (fileRealPath !== publicRealPath && !fileRealPath.startsWith(`${publicRealPath}${path.sep}`)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      if (!stats.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": MIME_TYPES[path.extname(fileRealPath).toLowerCase()] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Cache-Control": "no-cache",
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      const stream = fs.createReadStream(fileRealPath);
      stream.on("error", () => {
        if (!response.headersSent) response.writeHead(500);
        response.end("Unable to read file");
      });
      stream.pipe(response);
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      response.writeHead(500);
      response.end("Internal server error");
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "0.0.0.0";
  createServer().listen(port, host, () => {
    console.log(`AWSSBG-CDM is running at http://localhost:${port}`);
  });
}

module.exports = { createServer };
