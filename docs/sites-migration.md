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

## Operational requirements

Lighthouse serves both as a pre-deployment CI gate and as a periodic audit of
the published site. note articles need eventual synchronization, not real-time
updates. Article pages remain statically generated, including thumbnails.

| Responsibility | Trigger | Behavior |
|---|---|---|
| Audit the published site | Every three hours at minute 17, or manual | Run Lighthouse without building or deploying |
| Check note articles | Every three hours at minute 7 | Fetch RSS, normalize JSON, and compare hashes; deploy only if changed |
| Deploy code changes | Push to main, or manual | Fetch articles, build, pass Lighthouse, and deploy even if article data is unchanged |

The standalone audit uses `lighthouse-scheduled.yml`. It installs dependencies
with lifecycle scripts disabled and retains reports for 14 days. Both audits
cover home, creator, business, company, and articles, using the existing score
thresholds. `PRODUCTION_ORIGIN` overrides the default
`https://www.flair-agency.biz` for both the public audit and article comparison.
Use the actual public production origin, not an owner-only preview.

## Hash-based article synchronization

RSS commands remain inline in `firebase-hosting-deploy.yml`. The prepare job
uses `curl` → `xsltproc` → `jq` and `NOTE_RSS_URL`, rejecting empty or invalid
article data. `jq -cS` gives JSON stable key order and formatting while preserving
article array order. SHA-256 is calculated from those normalized bytes.

For a scheduled run, the workflow retrieves the newest available
`deployed-note-hash` artifact from a successful run of the same deployment
workflow. It checks up to 100 matching artifacts and ignores expired artifacts
and unsuccessful runs. Only a valid 64-character hash can suppress deployment.

- Same hash: skip build, preview, Lighthouse CI, and deployment.
- Changed hash: pass the generated JSON to preview and production jobs as a
  run artifact, build, pass Lighthouse, and deploy.
- Missing, expired, unreadable, or malformed hash: run the same CI/deployment
  path, rather than risk skipping an update.
- Code changes and manual runs: always run CI and deployment.

The comparison artifact contains only the hash and is saved after the Firebase
production deployment command succeeds. Its retention is 90 days. A failure
before or during deployment does not save a new hash. If deployment succeeds
but hash storage fails, a subsequent run may repeat CI and deployment; it does
not lose the article update. Production runs are serialized.

The complete JSON is used only as a short-lived Actions artifact to supply the
same input to preview and production builds. There is no second RSS fetch after
CI. Neither this JSON nor the comparison hash is copied into `public/` or `dist/`.
No comparison endpoint or special cache header is added to the public site.
Actions needs read permission to restore artifacts from prior runs.

Articles and thumbnails remain in static HTML. Visitors see new articles after
a successful deployment when they open or reload the page, subject to normal
HTML caching. An open page does not update itself. Synchronization may wait for
the next scheduled check, and Actions scheduling can be delayed; real-time
synchronization is not required. The independent public Lighthouse audit runs
regardless of whether article data changed.

The repository snapshot is a fallback for local or Sites preview builds, not
the comparison baseline. There is no browser-side data fetch or data-branch
update workflow. The obsolete JSON file on the old data branch has been removed.

## Sites deployment integration

The implementation above uses the existing Firebase deployment path. Sites
must eventually support the same sequence: changed JSON, build, Lighthouse
CI, and publication of the tested content. An official CI deployment interface
for Sites has not been verified in this environment. That integration remains
open; it is not a reason to introduce dynamic article rendering or a data branch.

Reference: [GitHub scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Production cutover conditions

- Prepare a separate production Site and verify the production build and public access.
- Verify the standalone Lighthouse workflow against the public site.
- Verify that changed article JSON passes through build and Lighthouse before
  deployment; unchanged JSON skips publication and failed CI retains the old site.
- Check key URLs, 404 responses, images, videos, contact links, and GTM behavior.
- Switch the custom domain and DNS, then verify operation on the actual domain.
- Retire Firebase code deployments after confirming stability. Scheduled audits
  and article synchronization remain enabled through their production paths. Retain the existing Firebase deployment
  temporarily as a fallback.

Handle dependency updates in dedicated PRs and check the build and key pages.
If a Sites deployment fails, redeploy a saved, known-good version. Match the
deployment destination to the build mode so that previews remain excluded
from search indexing and preview traffic does not enter production analytics.
