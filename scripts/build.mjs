import { spawnSync } from 'node:child_process';

const mode = process.argv[2] ?? process.env.SITE_ENV ?? 'preview';
if (!['preview', 'production'].includes(mode)) throw new Error(`Unknown SITE_ENV: ${mode}`);
const env = { ...process.env, SITE_ENV: mode };
for (const script of ['build:eleventy', 'build:tsc', 'build:css']) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', '--silent', script], { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const result = spawnSync(process.execPath, ['scripts/prepare-sites.mjs'], { env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
