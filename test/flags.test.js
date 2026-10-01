import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFlagFile, valueType, hasTargeting, evaluatorRefs } from '../src/index.js';

test('parseFlagFile merges flag metadata over flag-set metadata, flag wins', () => {
  const set = parseFlagFile(JSON.stringify({
    metadata: { owner: 'team-a', expires: '2099-01-01' },
    flags: { b: { state: 'ENABLED', variants: { on: true }, metadata: { owner: 'team-b' } }, a: { state: 'DISABLED', variants: { on: true } } }
  }));
  assert.deepEqual(set.flags.map((f) => f.key), ['a', 'b']);
  assert.equal(set.flags[0].metadata.owner, 'team-a');
  assert.equal(set.flags[1].metadata.owner, 'team-b');
  assert.equal(set.flags[1].metadata.expires, '2099-01-01');
});

test('parseFlagFile rejects files it cannot use at all', () => {
  assert.throws(() => parseFlagFile('{'), /not valid JSON/);
  assert.throws(() => parseFlagFile('[]'), /JSON object/);
  assert.throws(() => parseFlagFile('{"flag": {}}'), /no "flags" object/);
});

test('parseFlagFile keeps a flag that is not an object, marked invalid', () => {
  const set = parseFlagFile('{"flags": {"x": 5}}');
  assert.equal(set.flags[0].valid, false);
});

test('valueType tells null and arrays apart from objects', () => {
  assert.deepEqual([true, 'a', 1, null, [], {}].map(valueType), ['boolean', 'string', 'number', 'null', 'array', 'object']);
});

test('hasTargeting is false for missing, null and empty targeting', () => {
  assert.equal(hasTargeting({}), false);
  assert.equal(hasTargeting({ targeting: null }), false);
  assert.equal(hasTargeting({ targeting: {} }), false);
  assert.equal(hasTargeting({ targeting: { if: [true, 'on', 'off'] } }), true);
});

test('evaluatorRefs finds $ref at any depth', () => {
  assert.deepEqual(evaluatorRefs({ if: [{ $ref: 'a' }, 'on', { or: [{ $ref: 'b' }] }] }), ['a', 'b']);
  assert.deepEqual(evaluatorRefs(undefined), []);
});
