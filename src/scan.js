// Finds where flag keys are used in source code. Two kinds of evidence:
//   1. the key as a quoted string anywhere in a source file (counts as "used");
//   2. the key as the first argument of an OpenFeature evaluation call (counts as "evaluated", and must be defined).
// Plain text matching on purpose: no parser per language, so a key built at run time is not seen (docs/limits.md).

import { readdir, readFile, lstat } from 'node:fs/promises';
import { join, relative, sep, extname } from 'node:path';

export const SOURCE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.py', '.java', '.kt', '.cs', '.go', '.rb', '.php', '.swift', '.dart', '.rs', '.vue', '.svelte'
]);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'vendor', 'coverage', '.next', 'out', 'target', 'bin', 'obj', '__pycache__']);
const MAX_FILE_BYTES = 2 * 1024 * 1024;

// OpenFeature evaluation calls whose first argument is the flag key, in the SDK naming styles:
// getBooleanValue / getStringDetails (JS, Java, PHP), GetBooleanValueAsync (.NET), get_boolean_value (Python).
const CALLS = [
  /\b[gG]et(?:Boolean|String|Number|Integer|Int|Double|Float|Object|Struct)(?:Value|Details)(?:Async)?\s*(?:<[^>()]*>)?\s*\(\s*(['"`])([^'"`\n\\]+)\1/g,
  /\bget_(?:boolean|string|integer|float|object)_(?:value|details)\s*\(\s*(['"])([^'"\n\\]+)\1/g
];

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

// Scans the text of one file. Returns { used: Map key -> [line], evaluated: [{ key, line }] }.
export function scanText(text, keys) {
  const used = new Map();
  for (const key of keys) {
    const quoted = new RegExp(`(['"\`])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'g');
    for (const match of text.matchAll(quoted)) {
      if (!used.has(key)) used.set(key, []);
      used.get(key).push(lineOf(text, match.index));
    }
  }
  const evaluated = [];
  for (const pattern of CALLS) {
    for (const match of text.matchAll(pattern)) evaluated.push({ key: match[2], line: lineOf(text, match.index) });
  }
  return { used, evaluated };
}

async function walk(dir, out) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) await walk(full, out);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

// Scans every source file under the given directories (or single files).
// Returns { files, used: Map key -> [{ file, line }], evaluated: [{ key, file, line }], skipped: [file] }.
export async function scanSources(paths, keys) {
  const files = [];
  for (const path of paths) {
    const info = await lstat(path);
    if (info.isDirectory()) await walk(path, files);
    else if (info.isFile()) files.push(path);
  }
  const used = new Map();
  const evaluated = [];
  const skipped = [];
  for (const file of files.sort()) {
    const size = (await lstat(file)).size;
    const shown = relative(process.cwd(), file).split(sep).join('/') || file;
    if (size > MAX_FILE_BYTES) {
      skipped.push(shown);
      continue;
    }
    const result = scanText(await readFile(file, 'utf8'), keys);
    for (const [key, lines] of result.used) {
      if (!used.has(key)) used.set(key, []);
      for (const line of lines) used.get(key).push({ file: shown, line });
    }
    for (const item of result.evaluated) evaluated.push({ ...item, file: shown });
  }
  return { files: files.length, used, evaluated, skipped };
}
