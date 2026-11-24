# AWSSBG-CDM Website

Official website for the AWS Student Builder Group at Colegio de Muntinlupa.

## Requirements

- Node.js 20 or newer (Node.js 22 LTS recommended)
- npm

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

For a production-style local start:

```bash
npm start
```

The server uses `PORT` and `HOST` environment variables when provided. The default port is `3000` and the default host is `0.0.0.0`.

## Project structure

```text
awssbg-cdm-website/
├── public/                         # Files intentionally served to browsers
│   ├── admin/                      # Admin login, callback, and dashboard UI
│   ├── assets/                     # Shared images and brand assets
│   ├── css/                        # Public-site stylesheets
│   ├── email-assets/               # Images referenced by email templates
│   ├── js/                         # Public-site JavaScript
│   └── index.html                  # Public homepage
├── infrastructure/
│   └── lambda/
│       └── admin-recovery/         # Private AWS recovery function source
├── docs/
│   └── archive/
│       └── legacy-dashboard-snapshots/ # Historical text snapshots; not runtime code
├── tests/                          # Automated tests
├── server.js                       # Node.js static-file server
├── package.json                    # Scripts and dependencies
├── package-lock.json               # Locked dependency tree
├── .env.example                    # Documented local environment variables
├── .gitignore
└── README.md
```

## Public/private boundary

Only `public/` is exposed by the Node.js web server. Server code, AWS recovery source, local environment files, documentation, and archived snapshots are outside the static document root. Do not put secrets or private files in `public/`.

The recovery Lambda is maintained separately from the website runtime. Its own `package.json` and lockfile are retained in `infrastructure/lambda/admin-recovery/`. The existing `function.zip` deployment artifact is preserved locally but excluded from Git; keep a protected backup if it is needed for Lambda deployment.

See [`docs/architecture.md`](docs/architecture.md) for the public/private boundary and maintenance checklist.

## Tests

```bash
npm test
```

## Deployment notes

- Configure the deployment platform to run `npm install` followed by `npm start`.
- Ensure the platform runs the Node.js server entry point rather than publishing the repository root as a static site.
- Set `PORT` according to the hosting platform's requirements.
- Keep AWS credentials and other secrets in the hosting platform's secret/environment-variable manager, never in committed files or `public/`.
- The admin UI uses AWS Amplify and OIDC browser modules. Confirm the corresponding Cognito/OIDC callback URLs and allowed origins in the AWS identity-provider configuration after deployment.

## Maintenance conventions

- Use lowercase kebab-case for new file and directory names.
- Keep browser-delivered files in `public/` only.
- Keep backend/runtime code at the repository root or in a dedicated source directory, never under `public/`.
- Keep generated build output, dependency directories, logs, and secrets out of version control.
- Use Git history for source history; keep only intentional reference snapshots in `docs/archive/`.
