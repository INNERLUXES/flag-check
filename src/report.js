// Report formats: text for a terminal, Markdown for a pull request or job summary, JSON and CSV for other tools.

import { count } from './checks.js';

function summary(result) {
  const { problems, warnings } = count(result.findings);
  return `${result.flags} flag(s), ${problems} problem(s), ${warnings} warning(s)`;
}

export function toText(result) {
  const lines = [`flag-check: ${result.file}`];
  if (result.scan) lines.push(`source: ${result.scan.files} file(s) scanned${result.scan.skipped.length ? `, ${result.scan.skipped.length} too large and skipped` : ''}`);
  lines.push('');
  if (result.findings.length === 0) lines.push('no findings');
  for (const f of result.findings) lines.push(`${f.level === 'problem' ? 'PROBLEM' : 'warning'}  ${f.key}  [${f.check}]  ${f.message}`);
  lines.push('', summary(result));
  return lines.join('\n') + '\n';
}

function cell(text) {
  return String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function toMarkdown(result) {
  const lines = [`## flag-check: ${cell(result.file)}`, '', summary(result), ''];
  if (result.findings.length) {
    lines.push('| Level | Flag | Check | Finding |', '| --- | --- | --- | --- |');
    for (const f of result.findings) lines.push(`| ${f.level} | \`${cell(f.key)}\` | ${f.check} | ${cell(f.message)} |`);
  }
  return lines.join('\n') + '\n';
}

export function toJson(result) {
  const { problems, warnings } = count(result.findings);
  return JSON.stringify({
    file: result.file,
    flags: result.flags,
    problems,
    warnings,
    scannedFiles: result.scan ? result.scan.files : null,
    skippedFiles: result.scan ? result.scan.skipped : [],
    findings: result.findings
  }, null, 2) + '\n';
}

// A cell that starts with = + - @ or a tab would run as a formula in a spreadsheet; it is prefixed with a quote.
function csvCell(text) {
  let value = String(text);
  if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`;
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(result) {
  const rows = [['level', 'flag', 'check', 'finding']];
  for (const f of result.findings) rows.push([f.level, f.key, f.check, f.message]);
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
