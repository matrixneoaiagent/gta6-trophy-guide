// A working gta6-trophy-guide-01 entry (Node 22, standard library only): the guide is this directory's app/ folder,
// plain static files a browser opens at app/index.html (ES modules, CSS, no build step), offline: it loads nothing
// over the network, and its trophy list and guides are app/data/trophies.json. The program hands it in: it copies app/
// and screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the judge reads (your
// screenshots, the first load's files and bytes, and your source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Only the plumbing, not a winner: a plain checklist of the 55 trophies with a one-line hint each. Write a real guide
// for every trophy in your own words, a roadmap to the platinum, filters and a spoiler setting in app/, put 3 or 4 PNG
// or JPEG screenshots of it in screenshots/ (the first by name is the cover; shots.json says which views this
// starter's were taken of), and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

/**
 * Metadata identifiers for the GTA VI Trophy Atlas entry.
 */
const ATLAS_APPLICATION_TITLE = 'Grand Theft Auto VI - Vice City Trophy Atlas & Platinum Tracker';
const ATLAS_APPLICATION_VERSION = '2026.11.19-r1';

/**
 * Converts a raw byte count into a human-readable storage string.
 */
function describeDataVolume(byteLength: number): string {
  if (byteLength < 1024) return `${byteLength} B`;
  const kib = byteLength / 1024;
  if (kib < 1024) return `${kib.toFixed(2)} KiB`;
  const mib = kib / 1024;
  return `${mib.toFixed(2)} MiB`;
}

/**
 * Recursively scans a filesystem path to tally regular files and aggregate byte size.
 */
function inspectDirectoryStorage(targetPath: string): { count: number; totalBytes: number } {
  let count = 0;
  let totalBytes = 0;

  function traverse(current: string): void {
    if (!existsSync(current)) return;
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile()) {
        count += 1;
        totalBytes += statSync(fullPath).size;
      }
    }
  }

  traverse(targetPath);
  return { count, totalBytes };
}

/**
 * Prints a structured summary of the output package assets and dossier size.
 */
function logAssemblyManifest(destinationDir: string, dossierPayloadSize: number): void {
  const appMetrics = inspectDirectoryStorage(join(destinationDir, 'app'));
  const screenshotMetrics = inspectDirectoryStorage(join(destinationDir, 'screenshots'));
  const timestamp = new Date().toISOString();

  console.log(`================================================================`);
  console.log(`[ATLAS BUILD] ${ATLAS_APPLICATION_TITLE} (v${ATLAS_APPLICATION_VERSION})`);
  console.log(`[ATLAS BUILD] Timestamp          : ${timestamp}`);
  console.log(`[ATLAS BUILD] Destination folder : ${destinationDir}`);
  console.log(`[ATLAS BUILD] Web application files: ${appMetrics.count} files (${describeDataVolume(appMetrics.totalBytes)})`);
  console.log(`[ATLAS BUILD] Captured screenshots : ${screenshotMetrics.count} images (${describeDataVolume(screenshotMetrics.totalBytes)})`);
  console.log(`[ATLAS BUILD] Dossier manifest size: ${describeDataVolume(dossierPayloadSize)}`);
  console.log(`[ATLAS BUILD] Build Status       : COMPLETE (Zero runtime dependencies)`);
  console.log(`================================================================`);
}

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
const dossierBuffer = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});

writeFileSync(join(out, 'dossier.json'), dossierBuffer);

logAssemblyManifest(out, dossierBuffer.length);
