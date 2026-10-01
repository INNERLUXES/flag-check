// The checks. Each finding is { key, check, level, message }; level is "problem" or "warning".
// docs/checks.md describes every check and why it matters.

import { STATES, valueType, hasTargeting, evaluatorRefs } from './flags.js';

export const CHECKS = [
  { id: 'state', level: 'problem', title: 'state is ENABLED or DISABLED' },
  { id: 'variants', level: 'problem', title: 'variants exist and share one type' },
  { id: 'default-variant', level: 'problem', title: 'defaultVariant names a variant' },
  { id: 'evaluator', level: 'problem', title: 'targeting refers only to defined evaluators' },
  { id: 'owner', level: 'warning', title: 'the flag has an owner' },
  { id: 'removal-date', level: 'warning', title: 'the flag has a removal date that has not passed' },
  { id: 'fully-on', level: 'warning', title: 'a boolean flag on for everyone is removed' },
  { id: 'switched-off', level: 'warning', title: 'a disabled flag is removed or switched back on' },
  { id: 'unused', level: 'warning', title: 'the flag is used in the code' },
  { id: 'undefined', level: 'problem', title: 'every flag the code evaluates is defined' }
];

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Accepts YYYY-MM-DD only, and only real calendar days.
export function parseDay(text) {
  if (typeof text !== 'string') return null;
  const m = DATE.exec(text.trim());
  if (!m) return null;
  const day = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (day.getUTCFullYear() !== Number(m[1]) || day.getUTCMonth() !== Number(m[2]) - 1 || day.getUTCDate() !== Number(m[3])) return null;
  return text.trim();
}

function blank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

// Reviews a parsed flag set. options: { today: 'YYYY-MM-DD', ownerKey, removalKey, scan } where scan is the result of
// scanSources (or null when no source was given).
export function review(flagSet, options) {
  const { today, ownerKey = 'owner', removalKey = 'expires', scan = null } = options;
  const findings = [];
  const add = (key, check, level, message) => findings.push({ key, check, level, message });

  for (const flag of flagSet.flags) {
    if (!flag.valid) {
      add(flag.key, 'state', 'problem', 'the flag is not a JSON object');
      continue;
    }
    if (!STATES.has(flag.state)) add(flag.key, 'state', 'problem', `state is ${JSON.stringify(flag.state ?? null)}, expected "ENABLED" or "DISABLED"`);

    const names = flag.variants ? Object.keys(flag.variants) : [];
    if (names.length === 0) {
      add(flag.key, 'variants', 'problem', 'no variants');
    } else {
      const types = [...new Set(names.map((n) => valueType(flag.variants[n])))];
      if (types.length > 1) add(flag.key, 'variants', 'problem', `variants mix types: ${types.join(', ')}`);
    }

    if (flag.hasDefaultVariant && flag.defaultVariant !== null) {
      if (typeof flag.defaultVariant !== 'string') add(flag.key, 'default-variant', 'problem', 'defaultVariant must be a variant name or null');
      else if (!names.includes(flag.defaultVariant)) add(flag.key, 'default-variant', 'problem', `defaultVariant "${flag.defaultVariant}" is not one of the variants`);
    }

    for (const ref of evaluatorRefs(flag.targeting)) {
      if (!Object.prototype.hasOwnProperty.call(flagSet.evaluators, ref)) add(flag.key, 'evaluator', 'problem', `targeting refers to evaluator "${ref}", which is not defined`);
    }

    if (blank(flag.metadata[ownerKey])) add(flag.key, 'owner', 'warning', `no "${ownerKey}" in the flag or flag-set metadata`);

    const removal = flag.metadata[removalKey];
    if (blank(removal)) {
      add(flag.key, 'removal-date', 'warning', `no "${removalKey}" date in the metadata`);
    } else if (!parseDay(String(removal))) {
      add(flag.key, 'removal-date', 'problem', `"${removalKey}" is ${JSON.stringify(removal)}, expected a date as YYYY-MM-DD`);
    } else if (String(removal).trim() < today) {
      add(flag.key, 'removal-date', 'problem', `removal date ${String(removal).trim()} has passed`);
    }

    const value = typeof flag.defaultVariant === 'string' && flag.variants ? flag.variants[flag.defaultVariant] : undefined;
    if (flag.state === 'ENABLED' && !hasTargeting(flag) && value === true) {
      add(flag.key, 'fully-on', 'warning', 'on for everyone with no targeting: remove the flag and the old code path');
    }
    if (flag.state === 'DISABLED') add(flag.key, 'switched-off', 'warning', 'disabled: remove it with its code, or switch it back on');

    if (scan && !scan.used.has(flag.key)) add(flag.key, 'unused', 'warning', 'not found in the scanned source code');
  }

  if (scan) {
    const defined = new Set(flagSet.flags.map((f) => f.key));
    const seen = new Set();
    for (const item of scan.evaluated) {
      if (defined.has(item.key) || seen.has(item.key)) continue;
      seen.add(item.key);
      add(item.key, 'undefined', 'problem', `evaluated in ${item.file}:${item.line} but not defined in the flag file`);
    }
  }

  const order = new Map(CHECKS.map((c, i) => [c.id, i]));
  findings.sort((a, b) => (a.level === b.level ? 0 : a.level === 'problem' ? -1 : 1) || a.key.localeCompare(b.key) || order.get(a.check) - order.get(b.check));
  return findings;
}

export function count(findings) {
  return {
    problems: findings.filter((f) => f.level === 'problem').length,
    warnings: findings.filter((f) => f.level === 'warning').length
  };
}
