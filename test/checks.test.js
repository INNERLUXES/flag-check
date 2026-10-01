import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFlagFile, review, count, parseDay, CHECKS } from '../src/index.js';

const TODAY = '2030-06-15';
const ok = { owner: 'team', expires: '2030-12-31' };

function findingsFor(flags, options = {}) {
  const set = parseFlagFile(JSON.stringify({ flags, $evaluators: { known: { '==': [1, 1] } } }));
  return review(set, { today: TODAY, ...options }).map((f) => `${f.key}:${f.check}:${f.level}`);
}

test('a well-kept flag has no findings', () => {
  assert.deepEqual(findingsFor({ a: { state: 'ENABLED', variants: { on: true, off: false }, defaultVariant: 'off', targeting: { $ref: 'known' }, metadata: ok } }), []);
});

test('structure problems: state, variants, defaultVariant, unknown evaluator', () => {
  assert.deepEqual(findingsFor({
    a: { state: 'on', variants: { x: 1, y: 'two' }, defaultVariant: 'z', targeting: { $ref: 'missing' }, metadata: ok }
  }), ['a:state:problem', 'a:variants:problem', 'a:default-variant:problem', 'a:evaluator:problem']);
  assert.deepEqual(findingsFor({ b: { state: 'ENABLED', variants: {}, metadata: ok } }), ['b:variants:problem']);
});

test('defaultVariant may be null or left out', () => {
  assert.deepEqual(findingsFor({
    a: { state: 'ENABLED', variants: { on: true }, defaultVariant: null, metadata: ok },
    b: { state: 'ENABLED', variants: { on: true }, metadata: ok }
  }), []);
});

test('owner and removal date: missing, not a date, passed, today still fine', () => {
  assert.deepEqual(findingsFor({
    none: { state: 'ENABLED', variants: { on: true }, defaultVariant: null },
    word: { state: 'ENABLED', variants: { on: true }, defaultVariant: null, metadata: { owner: 'x', expires: 'next week' } },
    past: { state: 'ENABLED', variants: { on: true }, defaultVariant: null, metadata: { owner: 'x', expires: '2030-06-14' } },
    edge: { state: 'ENABLED', variants: { on: true }, defaultVariant: null, metadata: { owner: 'x', expires: '2030-06-15' } }
  }), ['past:removal-date:problem', 'word:removal-date:problem', 'none:owner:warning', 'none:removal-date:warning']);
});

test('the metadata keys can be renamed', () => {
  const flags = { a: { state: 'ENABLED', variants: { on: true }, defaultVariant: null, metadata: { team: 'x', removeBy: '2031-01-01' } } };
  assert.deepEqual(findingsFor(flags, { ownerKey: 'team', removalKey: 'removeBy' }), []);
});

test('fully on: boolean default true with no targeting; a string flag or a targeted flag is not', () => {
  assert.deepEqual(findingsFor({
    on: { state: 'ENABLED', variants: { on: true, off: false }, defaultVariant: 'on', metadata: ok },
    str: { state: 'ENABLED', variants: { a: 'a' }, defaultVariant: 'a', metadata: ok },
    tgt: { state: 'ENABLED', variants: { on: true, off: false }, defaultVariant: 'on', targeting: { fractional: [['on', 50], ['off', 50]] }, metadata: ok },
    off: { state: 'DISABLED', variants: { on: true, off: false }, defaultVariant: 'on', metadata: ok }
  }), ['off:switched-off:warning', 'on:fully-on:warning']);
});

test('with a source scan: unused flags and evaluated keys that are not defined', () => {
  const scan = { files: 1, skipped: [], used: new Map([['a', [{ file: 'x.js', line: 1 }]]]), evaluated: [{ key: 'a', file: 'x.js', line: 1 }, { key: 'ghost', file: 'x.js', line: 4 }, { key: 'ghost', file: 'y.js', line: 2 }] };
  const flags = { a: { state: 'ENABLED', variants: { on: true }, defaultVariant: null, metadata: ok }, b: { state: 'ENABLED', variants: { on: true }, defaultVariant: null, metadata: ok } };
  assert.deepEqual(findingsFor(flags, { scan }), ['ghost:undefined:problem', 'b:unused:warning']);
});

test('parseDay accepts real calendar days only', () => {
  assert.equal(parseDay('2032-02-29'), '2032-02-29');
  assert.equal(parseDay('2031-02-29'), null);
  assert.equal(parseDay('2031-13-01'), null);
  assert.equal(parseDay('31-01-2031'), null);
});

test('count and the list of checks', () => {
  assert.deepEqual(count([{ level: 'problem' }, { level: 'warning' }, { level: 'warning' }]), { problems: 1, warnings: 2 });
  assert.equal(new Set(CHECKS.map((c) => c.id)).size, CHECKS.length);
});
