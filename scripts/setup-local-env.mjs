#!/usr/bin/env node
/**
 * One-time local setup: create `.env` from `.env.example` if missing.
 * You still paste `VITE_YOUTUBE_API_KEY` yourself (see README).
 */
import { copyFile, access, constants } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const example = resolve(root, '.env.example');
const target = resolve(root, '.env');

try {
  await access(target, constants.F_OK);
  console.log('`.env` already exists — leaving it unchanged.');
  process.exit(0);
} catch {
  await copyFile(example, target);
  console.log('Created `.env` from `.env.example`.');
  console.log('');
  console.log('Next: open `.env` in an editor, set VITE_YOUTUBE_API_KEY= (your key), save, then run npm run dev.');
  process.exit(0);
}
