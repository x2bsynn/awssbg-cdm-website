# AWS Amplify Hosting deployment setup

This project is a static HTML/CSS/JavaScript frontend with separate AWS services. For standard Amplify Hosting (static hosting), deploy the contents of `public/`. Do not deploy the repository root as the website document root, and do not expect Amplify static hosting to run `server.js`.

## Build settings

The repository-root `amplify.yml` sets `frontend.artifacts.baseDirectory` to `public` and includes all files below it. If the Amplify app is connected to a repository where this project is nested in a subdirectory, configure the app's **App root** to that project directory (the directory containing this `amplify.yml`).

## Admin Portal route

The login document is `public/admin/index.html`; the homepage links to `/admin/`. Amplify normally maps directory URLs to `index.html`, but if `/admin/` still returns 404, add these exact rules in **Amplify Console → Hosting → Rewrites and redirects**. Keep them above any broad catch-all rule:

```json
[
  {
    "source": "/admin",
    "target": "/admin/index.html",
    "status": "200",
    "condition": null
  },
  {
    "source": "/admin/",
    "target": "/admin/index.html",
    "status": "200",
    "condition": null
  }
]
```

These are 200 rewrites, so the browser address remains `/admin/`. Do not add a broad `/<*> -> /index.html` SPA rewrite for this multi-page site; it can cause missing assets or real pages to be served as the homepage.

## Deploy

1. Commit and push `amplify.yml` to the branch connected to Amplify.
2. In Amplify, open **Hosting → Build settings** and confirm the build specification uses `public` as the artifact base directory. A repository `amplify.yml` takes precedence over console build settings.
3. Save the two `/admin` rewrite rules above if direct `/admin/` still returns 404.
4. Trigger a new deployment and wait for it to complete.
5. Test `/`, `/admin/`, `/admin/admin.css`, and `/admin/dashboard/dashboard.html`. Then test Cognito sign-in and the administrator-session redirect.

## Important distinction

`server.js` is useful for local Node.js testing (`npm start`), but standard Amplify static hosting does not run it. If the site needs a custom Node.js server at runtime, deploy that server to a Node.js compute host (for example, an appropriate AWS compute service) and configure Amplify/API routing separately. The Lambda recovery package remains a separate AWS Lambda deployment artifact; do not unzip it into `public/`.
