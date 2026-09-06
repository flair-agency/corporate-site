# Sites Migration and Update Operations

## Current state

- Source of truth: the `flair-agency/corporate-site` GitHub repository.
- Production: Firebase Hosting at `https://www.flair-agency.biz`.
- Preview: an owner-only Sites environment.
- `.openai/hosting.json` is environment-specific local configuration. Keep it out of
  GitHub and retain it in the Sites source repository. Use separate preview and
  production configurations, and retrieve and reuse existing Site IDs through the connector.
- Sites and GitHub are separate Git remotes. Automatic synchronization is not configured.
- This PR prepares the migration. Merging it does not publish to Sites or change DNS.

## Development and deployment

1. Create a working branch from the latest GitHub `main`.
2. Implement changes and validate them with a preview build.
3. Open a GitHub PR. Deploy to the preview environment through Sites.
4. Merge into GitHub after review. The existing Actions workflow currently deploys to Firebase.
5. After the production migration, deploy approved changes to a separate production Site.

The source saved in Sites must include the same changes as GitHub. If the Sites
and GitHub commit histories differ, apply the GitHub changes to the working tree
and then commit them in the Sites repository. Do not force-overwrite history to
synchronize the repositories.

## Build modes

| Command | Purpose | Search indexing blocked | GTM |
|---|---|---|---|
| `npm run build` | Preview when SITE_ENV is unset | Yes | Disabled |
| `npm run build:production` | Production | No | Enabled |
| `SITE_ENV=production npm ci` | Install and build in the existing Firebase CI workflow | No | Enabled |

`SITE_ENV` accepts only `preview` or `production`. Unknown values fail the build.
The existing Firebase workflow sets `SITE_ENV: production`, preserving search
indexing and analytics after the merge. Sites access controls are managed
separately: changing the build mode does not make a private Site public.

Eleventy, TypeScript, and Tailwind continue to write to `public/`. For Sites, the
output is copied to `dist/`, with a homepage at `/` and cache configuration.
Cache headers target canonical directory URLs, and missing pages return 404.

## Automatic article updates

Keep static generation and the existing sequence: fetch RSS, generate JSON,
build, and deploy. Do not convert the site to server-side execution solely to
fetch RSS.

Article retrieval and conversion remain inline in
`.github/workflows/firebase-hosting-deploy.yml`. The existing `curl` →
`xsltproc` → `jq` pipeline reads `NOTE_RSS_URL` and writes
`src/_data/note_articles.json` before the production build.

The existing Firebase workflow retains its three-hour schedule and deployment
steps. This PR does not extract or rewrite its article retrieval logic, add a
separate refresh command, or introduce a Python runtime dependency. Generated
JSON is passed to the build; no automatic commit to GitHub has been added.

The JSON stored in the repository is a fallback snapshot from 2026-09-06,
allowing preview builds without network access. It does not guarantee that
articles are current.

### Automatic deployment to Sites is not connected

As of 2026-09-06, the Sites deployment operations verified in this environment
use the ChatGPT Sites connector. An official deployment API and CI
authentication method usable from GitHub Actions have not been verified.
Short-lived Sites source-write tokens are not a deployment API and must not
be stored as persistent Actions secrets. Pushing to GitHub alone does not
update Sites.

Do not assume that articles will continue updating automatically after the
production migration to Sites. The checked-in snapshot supports preview builds, but a workflow for refreshing
articles and publishing them to Sites remains to be established. Keep Firebase's
automatic updates running until an officially supported scheduled deployment
method has been verified and demonstrated.

## Production cutover conditions

- Prepare a separate production Site and verify the production build and public access.
- Demonstrate automatic operation from article retrieval through Sites deployment.
  Also verify that failures preserve the previous version.
- Check key URLs, 404 responses, images, videos, contact links, and GTM behavior.
- Switch the custom domain and DNS, then verify operation on the actual domain.
- Stop scheduled Firebase deployments after confirming stability. Retain the
  existing Firebase deployment temporarily as a fallback.

Handle dependency updates in dedicated PRs and check the build and key pages.
If a Sites deployment fails, redeploy a saved, known-good version. Match the
deployment destination to the build mode so that previews remain excluded
from search indexing and preview traffic does not enter production analytics.
