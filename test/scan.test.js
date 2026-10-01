import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanText, scanSources, SOURCE_EXTENSIONS } from '../src/index.js';

test('scanText finds quoted keys with their lines, in any quote style', () => {
  const text = "const a = 'new-page';\nconst b = \"new-page\";\nconst c = `new-page`;\nconst d = new_page;\n";
  assert.deepEqual(scanText(text, ['new-page']).used.get('new-page'), [1, 2, 3]);
});

test('scanText does not count a key inside a longer key', () => {
  assert.equal(scanText("'new-page-v2'", ['new-page']).used.has('new-page'), false);
});

test('scanText reads the flag key of OpenFeature calls in several SDK styles', () => {
  const text = [
    "client.getBooleanValue('a', false)",
    'client.getStringDetails("b", "x")',
    'await client.GetBooleanValueAsync("c", false)',
    'client.get_boolean_value("d", False)',
    "client.getObjectValue<Config>('e', {})",
    'client.getBooleanValue(key, false)'
  ].join('\n');
  assert.deepEqual(scanText(text, []).evaluated, [
    { key: 'a', line: 1 }, { key: 'b', line: 2 }, { key: 'c', line: 3 }, { key: 'e', line: 5 }, { key: 'd', line: 4 }
  ]);
});

test('scanSources walks folders, skips node_modules and unknown file types', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flag-check-'));
  try {
    await mkdir(join(dir, 'src'));
    await mkdir(join(dir, 'node_modules', 'lib'), { recursive: true });
    await writeFile(join(dir, 'src', 'app.js'), "client.getBooleanValue('used', false)\n");
    await writeFile(join(dir, 'node_modules', 'lib', 'x.js'), "'other'\n");
    await writeFile(join(dir, 'notes.txt'), "'other'\n");
    const result = await scanSources([dir], ['used', 'other']);
    assert.equal(result.files, 1);
    assert.equal(result.used.has('used'), true);
    assert.equal(result.used.has('other'), false);
    assert.equal(result.evaluated[0].key, 'used');
    assert.ok(SOURCE_EXTENSIONS.has('.py'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
