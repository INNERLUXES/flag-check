// Runs flag-check on the example and checks that it finds exactly what the README says it finds.
// The example has problems on purpose, so the tool itself exits with 1; this script exits with 0 when that is the case.

import { main } from '../src/index.js';

let out = '';
const code = await main(
  ['examples/flags.json', '--src', 'examples/app', '--today', '2030-01-01'],
  { out: (t) => { out += t; }, err: (t) => process.stderr.write(t) }
);
process.stdout.write(out);
const expected = '5 flag(s), 5 problem(s), 4 warning(s)';
if (code !== 1 || !out.includes(expected)) {
  console.error(`example: expected exit code 1 and "${expected}", got exit code ${code}`);
  process.exit(1);
}
