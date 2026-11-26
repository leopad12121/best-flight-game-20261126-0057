// Sky Courier — the make.fun entrypoint. Node 22, standard library only.
//
// The entry is the game/ folder next to this file: static files a desktop
// browser loads with no network (index.html plus plain ES modules). Running
// this file hands the entry in: it copies game/ and screenshots/ into the
// output directory and writes dossier.json there with the make.fun library
// vendored under vendor/. Nothing here is generated or random, so running
// it twice writes the same bytes twice.
//
// Play it locally first: `node serve.ts`, then open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name) {
  const source = join(repoRoot, name);
  if (existsSync(source)) cpSync(source, join(outputDir, name), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree('game');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
copyTree('screenshots');

// Caps from the scorer's own reference: the text cap shapes the dossier's
// bytes, the rest refuse an entry the scorer would refuse — at most 4
// screenshots of 256 KiB each, at most 993 files or 48 MiB under game/,
// and no game/ path longer than 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
