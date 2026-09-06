import { copyFileSync, readdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';

copyFileSync('public/home/index.html', 'public/index.html');
// Firebase consumes public; Sites consumes a separate generated directory.
rmSync('dist', { recursive: true, force: true });
cpSync('public', 'dist', { recursive: true });
const longCache = new Set(['.woff2', '.woff', '.ttf', '.otf', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg', '.ico', '.json', '.webm', '.mp4', '.wasm']);
const shortCache = new Set(['.html', '.css', '.js', '.mjs']);
const lines = process.env.SITE_ENV === 'production' ? [] : ['/*', '  X-Robots-Tag: noindex, nofollow', ''];
function visit(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { visit(path); continue; }
    const ext = extname(path);
    const cache = longCache.has(ext) ? 'public,max-age=31536000,immutable' : shortCache.has(ext) ? 'public,max-age=300,must-revalidate' : null;
    if (!cache) continue;
    const route = '/' + path.slice(5);
    const canonicalRoute = route.endsWith('/index.html') ? route.slice(0, -10) : route;
    lines.push(canonicalRoute, '  Cache-Control: ' + cache, '');
  }
}
visit('dist');
writeFileSync('dist/_headers', lines.join('\n'));
