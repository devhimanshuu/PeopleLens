#!/usr/bin/env node
// Verify the transform only changes comments: strip all comments from both the original and transformed code,…
// then compare. Any difference means the transform corrupted code. Walks the same tree as collapse-comments.mjs.
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from './collapse-comments.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const EXCLUDE_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage', '.git', 'migrations']);
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.prisma']);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || EXCLUDE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(extname(entry.name))) yield full;
  }
}

function stripComments(code) {
  const out = [];
  let i = 0;
  const n = code.length;
  const skipString = (q) => {
    let j = i + 1;
    while (j < n) {
      if (code[j] === '\\') j += 2;
      else if (code[j] === q) return j + 1;
      else j += 1;
    }
    return n;
  };
  while (i < n) {
    const c = code[i];
    const d = code[i + 1];
    if (c === "'" || c === '"') {
      out.push(code.slice(i, skipString(c)));
      i = skipString(c);
    } else if (c === '`') {
      let j = i + 1;
      while (j < n) {
        if (code[j] === '\\') j += 2;
        else if (code[j] === '`') break;
        else j += 1;
      }
      out.push(code.slice(i, Math.min(j + 1, n)));
      i = Math.min(j + 1, n);
    } else if (c === '/' && d === '/') {
      while (i < n && code[i] !== '\n') i += 1;
    } else if (c === '/' && d === '*') {
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i += 1;
      i = Math.min(i + 2, n);
    } else {
      out.push(c);
      i += 1;
    }
  }
  return out.join('').replace(/\s+/g, '');
}

let checked = 0;
let bad = 0;
for (const f of walk(ROOT)) {
  const src = readFileSync(f, 'utf8');
  const out = transform(src);
  checked += 1;
  if (stripComments(src) !== stripComments(out)) {
    bad += 1;
    console.log(`[CORRUPTED] ${f}`);
  }
}
console.log(`Checked ${checked} files.`);
console.log(bad === 0 ? 'All files: code untouched.' : `${bad} file(s) corrupted!`);
process.exit(bad === 0 ? 0 : 1);
