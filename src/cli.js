// Command line: flag-check <flags.json> [--src <dir>]... [options]

import { readFile, writeFile } from 'node:fs/promises';
import { parseFlagFile } from './flags.js';
import { review, count, parseDay } from './checks.js';
import { scanSources } from './scan.js';
import { toText, toMarkdown, toJson, toCsv } from './report.js';

const FORMATS = { text: toText, markdown: toMarkdown, json: toJson, csv: toCsv };

export const USAGE = `Usage: flag-check <flags.json> [options]

Checks a flagd (OpenFeature) flag definition file: every flag valid, with an owner and a removal date
that has not passed, and no flag left on for everyone or switched off for good.

Options:
  --src <path>          also scan source code (repeatable): flags never used, keys evaluated but not defined
  --owner-key <name>    metadata key that names the owner (default: owner)
  --removal-key <name>  metadata key that holds the removal date, YYYY-MM-DD (default: expires)
  --today <YYYY-MM-DD>  the day to compare removal dates with (default: today, UTC)
  --format <name>       text, markdown, json or csv (default: text)
  --output <file>       write the report to a file instead of the screen
  --fail-on <level>     problem (default) or warning: exit code 1 when a finding of that level or worse exists
  --help                show this text
`;

export function parseArgs(argv) {
  const options = { file: null, src: [], ownerKey: 'owner', removalKey: 'expires', today: null, format: 'text', output: null, failOn: 'problem', help: false };
  const takes = { '--src': 'src', '--owner-key': 'ownerKey', '--removal-key': 'removalKey', '--today': 'today', '--format': 'format', '--output': 'output', '--fail-on': 'failOn' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (Object.prototype.hasOwnProperty.call(takes, arg)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`${arg} needs a value`);
      i += 1;
      if (arg === '--src') options.src.push(value);
      else options[takes[arg]] = value;
    } else if (arg.startsWith('-')) {
      throw new Error(`unknown option ${arg}`);
    } else if (options.file === null) {
      options.file = arg;
    } else {
      throw new Error(`one flag file only, got a second: ${arg}`);
    }
  }
  if (!options.help) {
    if (!options.file) throw new Error('give the flag file to check');
    if (!FORMATS[options.format]) throw new Error(`unknown format ${options.format}`);
    if (!['problem', 'warning'].includes(options.failOn)) throw new Error('--fail-on takes problem or warning');
    if (options.today !== null && !parseDay(options.today)) throw new Error('--today takes a date as YYYY-MM-DD');
  }
  return options;
}

// Returns the exit code: 0 clean, 1 findings at or above --fail-on, 2 usage or input error.
export async function main(argv, io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    io.err(`flag-check: ${error.message}\n\n${USAGE}`);
    return 2;
  }
  if (options.help) {
    io.out(USAGE);
    return 0;
  }
  let flagSet;
  try {
    flagSet = parseFlagFile(await readFile(options.file, 'utf8'));
  } catch (error) {
    io.err(`flag-check: ${options.file}: ${error.message}\n`);
    return 2;
  }
  let scan = null;
  if (options.src.length) {
    try {
      scan = await scanSources(options.src, flagSet.flags.map((f) => f.key));
    } catch (error) {
      io.err(`flag-check: cannot read source: ${error.message}\n`);
      return 2;
    }
  }
  const today = options.today || new Date().toISOString().slice(0, 10);
  const findings = review(flagSet, { today, ownerKey: options.ownerKey, removalKey: options.removalKey, scan });
  const report = FORMATS[options.format]({ file: options.file, flags: flagSet.flags.length, findings, scan });
  if (options.output) await writeFile(options.output, report, 'utf8');
  else io.out(report);
  const { problems, warnings } = count(findings);
  return problems > 0 || (options.failOn === 'warning' && warnings > 0) ? 1 : 0;
}
