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

All RSS shell commands remain inline in `firebase-hosting-deploy.yml`. The
prepare job uses the existing `curl` → `xsltproc` → `jq` conversion and
`NOTE_RSS_URL` repository variable. It rejects an empty or invalid article array.

For a scheduled run:

1. Serialize the generated JSON with `jq -cS` for stable key order and formatting.
   Preserve array order because it determines the order of displayed articles.
2. Fetch `/note-articles.json` from the actual production origin. This file is
   published with the site and contains the exact article data used by that build.
3. Normalize the published JSON the same way and compare SHA-256 hashes.
4. If the hashes match, skip the build, preview, Lighthouse CI, and deployment.
   The independent public Lighthouse audit continues on its own schedule.
5. If they differ, pass the generated JSON to subsequent jobs as a run artifact.
   Build a preview, run Lighthouse, and deploy only after the gate passes.

Both preview and production builds download the same artifact into
`src/_data/note_articles.json` before building. There is no second RSS fetch
between testing and deployment. The pipeline also builds this snapshot into
`/note-articles.json`; it is a comparison baseline, not a browser data source.
It contains only the already public article metadata and is served with
`Cache-Control: no-store`. Comparison requests also avoid cached responses.

A 404 for the published JSON triggers the first deployment that establishes the
baseline. Network errors, other HTTP errors, and invalid published JSON fail the
check instead of silently treating them as a content change. Failed builds,
Lighthouse gates, or deployments do not advance the published baseline; the
next scheduled run can retry the change. Production runs are serialized to
avoid overlapping deployments. Manual and code-change runs always use CI and
deployment, regardless of whether article hashes match.

There is no data branch, browser fetch, or separate note update workflow.
The HTML includes articles and thumbnails at build time. Visitors see new
articles once the successful deployment becomes available and they open or
reload the page, subject to the normal HTML cache policy. An already open page
does not update itself. RSS changes may wait until the next scheduled check;
Actions scheduling can also be delayed. This is intentionally not a real-time
synchronization guarantee.

The repository snapshot remains a fallback for local or Sites preview builds.
It is not used as the last-successful-deployment baseline. The run artifact
transfers data between jobs only; its expiry does not affect future comparisons.

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
