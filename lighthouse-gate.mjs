#!/usr/bin/env node
/**
 * Usage:
 *   node parse-lighthouse-categories.js < lighthouse-report.json
 *
 * Output (stdout):
 *   <METRIC>\t<SCORE_0_1>\t<PASS|FAIL>
 *
 * Exit code (bitmask, 0..15):
 *   bit0 (1): PERFORMANCE failed
 *   bit1 (2): ACCESSIBILITY failed
 *   bit2 (4): BEST_PRACTICES failed
 *   bit3 (8): SEO failed
 *
 * Threshold override via env (0.0–1.0):
 *   PERFORMANCE_MIN_SCORE=0.9
 *   ACCESSIBILITY_MIN_SCORE=0.9
 *   BEST_PRACTICES_MIN_SCORE=0.9
 *   SEO_MIN_SCORE=0.9
 */
import { text } from 'node:stream/consumers';

await text(process.stdin).then(JSON.parse).then(({ categories = {} }) => {
  const exitCode = [
    {
      name: "PERFORMANCE",
      bit: 1 << 0,
      score: () => categories?.performance?.score,
    },
    {
      name: "ACCESSIBILITY",
      bit: 1 << 1,
      score: () => categories?.accessibility?.score,
    },
    {
      name: "BEST_PRACTICES",
      bit: 1 << 2,
      score: () => categories?.["best-practices"]?.score,
    },
    {
      name: "SEO",
      bit: 1 << 3,
      score: () => categories?.seo?.score,
    },
  ].reduce((exitCode, metric) => {
    const score = metric.score();
    const min = ((defaultMinScore) => {
      const fallback = metric.fallback ?? defaultMinScore;
      const v = process.env[`${metric.name}_MIN_SCORE`];
      if (v == null || v === "") return fallback;
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    })(.9);
    const failed = score == null || Number.isNaN(score) || score < min;

    process.stdout.write(`${metric.name}\t${Number.isFinite(score) ? score.toFixed(2) : "N/A"}\t${failed ? "FAIL" : "PASS"}\n`);

    return failed ? exitCode | metric.bit : exitCode;
  }, 0);
  process.exit(exitCode);
}).catch((error) => {
  console.error(error?.message ?? String(error));
  process.exit(255);
});
