# Architecture and file ownership

## Runtime boundaries

- `server.js` is the Node.js HTTP entry point.
- `public/` is the only directory exposed by the static web server.
- `public/` contains browser-delivered HTML, CSS, JavaScript, images, and other static resources. Do not place credentials, source-only recovery packages, or server code here.
- `infrastructure/lambda/admin-recovery/` is a separately packaged AWS Lambda project with its own dependency manifest and lockfile. It is not part of the website's static runtime.
- `docs/archive/` stores historical reference snapshots. Archived files are not loaded by the website.
- `tests/` contains automated checks for the Node.js server and public/private boundary.

## Why the public directory matters

A static web server should expose only files intentionally published to browsers. Serving the repository root risks exposing package manifests, server source, documentation, local configuration, and operational artifacts. The server therefore resolves requested paths under `public/`, rejects hidden path segments and unsupported methods, and checks resolved filesystem paths to prevent traversal and symlink escapes.

## Change checklist

When adding a page or asset:

1. Put browser-facing files under `public/`.
2. Keep the existing URL and relative-path conventions in mind when moving files.
3. Never put secrets or private operational files under `public/`.
4. Add/update tests when changing routing or server behavior.
5. Run `npm test` and syntax-check changed JavaScript before merging.
6. Update this document and `README.md` when the architecture changes.
