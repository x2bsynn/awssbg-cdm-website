# AWSSBG-CDM Website

The official website of the **AWS Student Builder Group - Colegio de Muntinlupa (AWSSBG-CDM)**. The project provides a central online presence for the organization, shares its activities and learning opportunities, and gives authorized officers a portal for maintaining website content.

**Website:** <https://www.awssbg-cdm.live>  
**Repository:** <https://github.com/x2bsynn/awssbg-cdm-website>

---

## About the organization

The **AWS Student Builder Group - Colegio de Muntinlupa**, also known as **AWSSBG-CDM**, is a student-led cloud and technology community based at Colegio de Muntinlupa.

The group was previously known as **AWS Cloud Club - CDM (AWSCC-CDM)**. It adopted the AWS Student Builder Group name as part of the broader AWSSBG rebranding.

AWSSBG-CDM gives students opportunities to explore cloud computing and related technologies through shared learning, practical activities, community events, and collaboration. The group also encourages members to take part in organizing activities and developing their leadership and technical skills.

### What the group does

- **Cloud learning:** Introduces members to AWS, cloud concepts, and cloud services through learning sessions and workshops.
- **Hands-on activities:** Encourages practical exploration, demonstrations, and project-based learning.
- **Events and community:** Organizes onboarding sessions, workshops, talks, and other activities for the campus community.
- **Learning opportunities:** Shares opportunities for technical development, certifications, and participation in the wider builder community.
- **Student leadership:** Gives members opportunities to contribute to planning, communications, creatives, technical activities, and organizational operations.

The organization is campus-based and student-led. Its activities, announcements, and leadership information are communicated through its official channels and website.

---

## About this website

This repository contains the source code for the AWSSBG-CDM public website and its administration portal.

The website is intended to:

- Introduce AWSSBG-CDM and provide information about the organization.
- Publish upcoming activities and event announcements.
- Present the organization's officers and organizational structure.
- Provide contact and other relevant organization information.
- Allow authorized administrators to manage supported website content through a protected admin portal.

### Main areas

| Area | Purpose |
| --- | --- |
| Public website | Organization information, announcements, events, officers, and contact details |
| Events | Displays published organization activities and event information |
| Officers | Presents the organization's current leadership and organizational structure |
| Admin portal | Provides authorized administrators with tools to manage supported content |

The public website and the admin portal have different access requirements. Administrative functions must not be treated as public content.

---

## Technology and architecture

The project uses a Node.js-based local development server and AWS services for its hosted website and backend functionality.

### Main technologies

- **HTML, CSS, and JavaScript** for the browser-based website.
- **Node.js and npm** for local development scripts, dependency management, and serving the site.
- **AWS Amplify Hosting** for website hosting and deployment.
- **Amazon Cognito** for administrator authentication and access control.
- **Amazon API Gateway** for HTTP API endpoints.
- **AWS Lambda** for backend request handling.
- **Amazon DynamoDB** for application data.
- **Amazon S3** for object storage and supporting assets or workflows.
- **Amazon SES** for email-related functionality.

The exact services used by a particular feature may vary as the project evolves. Refer to the implementation and AWS configuration before changing or removing an integration.

### Public and private boundary

Only files inside `public/` are exposed by the Node.js web server. Server code, AWS recovery source, local environment files, documentation, and archived snapshots are outside the static document root.

**Do not place credentials, secrets, private member information, or backend-only files inside `public/`.**

Sensitive member information must remain restricted to authorized administrative access. The backend/API must enforce access rules; hiding a field in the browser interface is not sufficient protection. Public endpoints should return only fields explicitly approved for public display.

The administrator portal uses AWS Amplify and locally bundled browser dependencies, including `oidc-client-ts`. These dependencies are built locally rather than loaded from a third-party CDN at runtime.

---

## Requirements

- Node.js 20 or newer (Node.js 22 LTS recommended)
- npm
- Git (recommended for cloning the repository and managing changes)

Check your installed versions:

```bash
node --version
npm --version
git --version
```

---

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/x2bsynn/awssbg-cdm-website.git
cd awssbg-cdm-website
```

If you already have the repository on your computer, open its root folder in VS Code.

### 2. Install dependencies

Run this from the repository root, where `package.json` is located:

```bash
npm install
```

### 3. Configure local environment variables, if needed

Review `.env.example` and the relevant application configuration. If a feature requires environment variables, create a local `.env` file using the documented variable names and provide the appropriate development values.

Do not commit `.env` files, AWS credentials, tokens, or other secrets. Do not copy production secrets into a local development environment.

### 4. Start the development server

```bash
npm run dev
```

Open:

<http://localhost:3000>

The development command builds the Admin Portal browser dependencies before starting the local server.

### 5. Run the production-style local server

To start the application using the production-style script:

```bash
npm start
```

The server uses the `PORT` and `HOST` environment variables when provided. The default port is `3000` and the default host is `0.0.0.0`.

---

## Admin portal: local development notes

The Admin Portal uses browser modules and AWS authentication. For local testing, use the project's Node.js development server:

```bash
npm run dev
```

Do not assume that opening an admin HTML file directly with `file://` or serving it from an unrelated Live Server root is equivalent to running the project. The application relies on its expected file paths, module build output, and route structure.

Local authentication also depends on the Cognito/OIDC configuration. The local origin and callback URL must be allowed by the identity-provider configuration. If authentication redirects unexpectedly or the dashboard does not appear:

1. Confirm the development server is running from the repository root.
2. Open the local URL served by the project, normally <http://localhost:3000>.
3. Check the browser Console and Network panel for failed JavaScript module or asset requests.
4. Confirm that the local callback URL and allowed sign-in/sign-out URLs are configured in the relevant AWS identity-provider settings.
5. Confirm that the signed-in account has the required administrator permissions.

Do not bypass authentication checks to make the dashboard appear. The dashboard should remain inaccessible to users who are not authorized administrators.

---

## Project structure

```text
awssbg-cdm-website/
├── public/                              # Files intentionally served to browsers
│   ├── admin/                           # Admin login, callback, and dashboard UI
│   ├── assets/                          # Shared images and brand assets
│   ├── css/                             # Public-site stylesheets
│   ├── email-assets/                    # Images referenced by email templates
│   ├── js/                              # Public-site JavaScript
│   └── index.html                       # Public homepage
├── infrastructure/
│   └── lambda/
│       └── admin-recovery/               # Private AWS recovery function source
├── docs/
│   ├── architecture.md                  # Architecture and maintenance notes
│   └── archive/
│       └── legacy-dashboard-snapshots/  # Historical snapshots; not runtime code
├── tests/                               # Automated tests
├── server.js                            # Node.js static-file server
├── package.json                         # Scripts and dependencies
├── package-lock.json                    # Locked dependency tree
├── amplify.yml                          # AWS Amplify Hosting build configuration
├── .env.example                         # Documented local environment variables
├── .gitignore
└── README.md
```

This is a high-level map. Check the actual repository when adding or moving files; the structure may change as development continues.

---

## Admin Portal dependency build

The Admin Portal bundles AWS Amplify and `oidc-client-ts` locally. The browser does not load these libraries from `esm.sh`.

The following commands are available from the repository root:

```bash
npm install
npm run dev
```

Both `npm run dev` and `npm start` automatically build the browser bundles first.

To build the Admin Portal dependencies manually:

```bash
npm run build:admin
```

To preview the built static frontend separately:

```bash
npm run build:admin
npx serve public -l 3001
```

Use the project's normal development server when testing the full application, especially routes and authentication.

---

## Tests

Run the automated tests from the repository root:

```bash
npm test
```

Run tests before submitting changes and after modifying shared application behavior.

---

## Deployment notes

The repository is configured for AWS Amplify Hosting.

The root `amplify.yml` configures Amplify to:

1. Install dependencies with `npm install --include=dev`.
2. Build the Admin Portal browser dependencies with `npm run build:admin`.
3. Publish the `public/` directory.

When changing dependencies, run `npm install` locally and commit the updated `package-lock.json` so local and hosted installs use the same dependency versions.

Before deployment:

- Confirm the Amplify build completes successfully.
- Confirm the correct build output directory is `public/`.
- Confirm the Cognito/OIDC callback URLs and allowed origins include the deployed website origin.
- Keep AWS credentials and other secrets in the appropriate AWS secret or environment-variable configuration, never in committed files or `public/`.
- Verify public API responses contain only approved public information.
- Verify administrative endpoints enforce authorization on the backend.
- Test the public website and admin portal after deployment.

---

## Maintenance and contribution conventions

- Use lowercase kebab-case for new file and directory names.
- Keep browser-delivered files in `public/` only.
- Keep backend/runtime code at the repository root or in a dedicated source directory, never under `public/`.
- Keep generated build output, dependency directories, logs, and secrets out of version control.
- Use Git history for source history; keep only intentional reference snapshots in `docs/archive/`.
- Preserve the separation between public information and administrator-only information.
- Do not remove authentication or backend authorization checks as a shortcut for local testing.
- Update this README when setup commands, architecture, major features, or organization information changes.

For additional architecture details and the public/private maintenance checklist, see [`docs/architecture.md`](docs/architecture.md).

---

## Organization links

- **Official website:** <https://www.awssbg-cdm.live>
- **GitHub repository:** <https://github.com/x2bsynn/awssbg-cdm-website>
