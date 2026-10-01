import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { toText, toMarkdown, toJson, toCsv, parseArgs, main } from '../src/index.js';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const example = join(root, 'examples', 'flags.json');
const app = join(root, 'examples', 'app');

const result = {
  file: 'flags.json',
  flags: 2,
  scan: null,
  findings: [
    { key: 'a|b', check: 'state', level: 'problem', message: 'bad' },
    { key: '=cmd', check: 'owner', level: 'warning', message: 'no "owner", here' }
  ]
};

test('every format reports the same findings', () => {
  assert.match(toText(result), /PROBLEM {2}a\|b {2}\[state\] {2}bad/);
  assert.match(toText(result), /2 flag\(s\), 1 problem\(s\), 1 warning\(s\)/);
  assert.match(toMarkdown(result), /\| problem \| `a\\\|b` \| state \| bad \|/);
  const json = JSON.parse(toJson(result));
  assert.equal(json.problems, 1);
  assert.equal(json.findings.length, 2);
});

test('CSV cells cannot run as spreadsheet formulas', () => {
  const csv = toCsv(result);
  assert.match(csv, /^level,flag,check,finding\r\n/);
  assert.match(csv, /warning,'=cmd,owner,"no ""owner"", here"/);
});

test('parseArgs reads options and refuses bad input', () => {
  const o = parseArgs(['f.json', '--src', 'a', '--src', 'b', '--format', 'json', '--today', '2030-01-01']);
  assert.deepEqual(o.src, ['a', 'b']);
  assert.equal(o.format, 'json');
  assert.throws(() => parseArgs([]), /flag file/);
  assert.throws(() => parseArgs(['f.json', '--format', 'xml']), /unknown format/);
  assert.throws(() => parseArgs(['f.json', '--today', 'tomorrow']), /YYYY-MM-DD/);
  assert.throws(() => parseArgs(['f.json', '--src']), /needs a value/);
  assert.throws(() => parseArgs(['f.json', 'g.json']), /one flag file only/);
});

test('main on the example: exit 1 with the expected findings', async () => {
  let out = '';
  const code = await main([example, '--src', app, '--today', '2030-01-01', '--format', 'json'], { out: (t) => { out += t; }, err: () => {} });
  assert.equal(code, 1);
  const json = JSON.parse(out);
  assert.equal(json.flags, 5);
  assert.equal(json.problems, 5);
  assert.equal(json.warnings, 4);
  assert.deepEqual(json.findings.filter((f) => f.check === 'undefined').map((f) => f.key), ['search-suggestions']);
});

test('main: exit 2 on a missing file, 0 with --help', async () => {
  let err = '';
  assert.equal(await main(['no-such-file.json'], { out: () => {}, err: (t) => { err += t; } }), 2);
  assert.match(err, /no-such-file\.json/);
  assert.equal(await main(['--help'], { out: () => {}, err: () => {} }), 0);
});
