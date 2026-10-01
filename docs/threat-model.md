# Threat model

## What the tool touches

- It reads one flag file and, with `--src`, the source files under the given paths.
- It writes only when `--output` is given, and only that file.
- It opens no network connection, loads no plugins and runs nothing from the files it reads.

## What could go wrong, and what stops it

| Risk | Control |
| --- | --- |
| A crafted flag file makes the tool hang or use unbounded memory | The file is parsed once with `JSON.parse`; the `$ref` search walks the parsed object without recursion into strings |
| A source tree with symbolic links makes the scan leave the given folder or loop | Symbolic links are not followed |
| A huge generated file slows the scan down | Files over 2 MB are skipped and listed |
| A flag key with special characters breaks the search pattern | Keys are escaped before they are used in a regular expression |
| A CSV report runs as a formula when opened in a spreadsheet | Cells that start with `=`, `+`, `-`, `@`, a tab or a carriage return are prefixed with a quote |
| A Markdown report breaks its table | Pipe characters and line breaks in keys and messages are escaped |

## Out of scope

What the product does with its flags at run time, and the security of the flag service itself.
