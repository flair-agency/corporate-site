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

The requirements are periodic Lighthouse checks and reflecting note article
updates. Periodic site deployment is an implementation detail, not a requirement
or a prerequisite for the migration.

| Responsibility | Workflow | Schedule | Site deployment |
|---|---|---|---|
| Audit the published site | `lighthouse-scheduled.yml` | Every three hours at minute 17 | None |
| Refresh public article data | `note-articles-update.yml` | Every three hours at minute 7 | None |
| Deploy code changes to Firebase during migration | `firebase-hosting-deploy.yml` | Push to main or manual | Yes |

The deployment workflow retains its pre-deployment Lighthouse gate and inline
RSS conversion. Its scheduled trigger is removed. The new scheduled audit runs
against the already published site, installs dependencies with lifecycle scripts
disabled, and does not build or deploy. Reports are retained for 14 days and the
existing category score thresholds still apply. It audits home, creator,
business, and company, matching the existing coverage.

`LIGHTHOUSE_ORIGIN` can override the default `https://www.flair-agency.biz`.
Use a public origin; an owner-only preview would audit the sign-in page instead.
After the hosting cutover, keeping the same custom domain requires no workflow
change. The audit includes crawlability checks for the public site.

## Article data without site deployment

The article update workflow keeps shell commands inline, reusing the existing
`curl` → `xsltproc` → `jq` conversion and `NOTE_RSS_URL` repository variable.
It validates a nonempty article array before writing anything to the dedicated
`site-data` branch. Failed retrieval or validation leaves the published JSON
unchanged. Identical data does not create a commit. The branch is initialized
with the existing public article snapshot before rollout.

The article page fetches the public file at:

`https://raw.githubusercontent.com/flair-agency/corporate-site/site-data/note-articles.json`

A successful fetch updates only the article cards, preserving their structure
and styling. Every item is validated before replacing the list. Titles and
summaries are inserted as text, and links must point to HTTPS note.com URLs.
A five-second timeout, HTTP error, invalid data, or disabled JavaScript leaves
the statically generated list visible. No visitor credentials are sent.

This keeps the site static and works with either Firebase or Sites. New article
data does not require rebuilding the site, publishing a Sites version, or
calling a Sites API from GitHub Actions. The data workflow has repository
contents-write permission solely to update its data branch; it uses the normal
GITHUB_TOKEN, not a long-lived token or Sites credential.

The tradeoff is that the newest list depends on JavaScript and GitHub Raw
availability. HTML-only clients see the snapshot from the last site build.
GitHub Raw caching and Actions scheduling delays can postpone updates beyond
the nominal three-hour interval. Refresh happens on page load, not continuously
while an existing tab stays open. The JSON endpoint is public and must contain
only public note article metadata; keep the source repository public for this
approach.

The existing deployment pipeline still refreshes the static snapshot whenever
code is deployed to Firebase. For Sites builds, the checked-in snapshot remains
a fallback; the live JSON supplies subsequent article updates.

Reference: [GitHub scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
and [GITHUB_TOKEN permissions](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token).

## Production cutover conditions

- Prepare a separate production Site and verify the production build and public access.
- Verify the standalone Lighthouse workflow against the public site.
- Verify that updating the article data changes the displayed list without a site
  deployment, and that failed requests leave the fallback list visible.
- Check key URLs, 404 responses, images, videos, contact links, and GTM behavior.
- Switch the custom domain and DNS, then verify operation on the actual domain.
- Retire Firebase code deployments after confirming stability. Scheduled audits
  and article data updates remain enabled. Retain the existing Firebase deployment
  temporarily as a fallback.

Handle dependency updates in dedicated PRs and check the build and key pages.
If a Sites deployment fails, redeploy a saved, known-good version. Match the
deployment destination to the build mode so that previews remain excluded
from search indexing and preview traffic does not enter production analytics.
