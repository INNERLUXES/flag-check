# Security

## Reporting a problem

Write to info@innerluxes.dev with the subject line "flag-check security", or use private vulnerability reporting on this repository. Please do not open a public issue for a vulnerability.

Include a small made-up flag file or source file that shows the problem, what you expected and what happened.

## Scope

In scope:

- a flag file or source tree that makes the tool hang or use unbounded memory
- a scan that leaves the paths it was given
- a CSV or Markdown report that runs as a formula or breaks its table
- anything that makes the tool open a network connection, or read or write a file it was not given

Out of scope: how the product uses its flags at run time; docs/limits.md lists what a file check cannot see.

Read [docs/threat-model.md](docs/threat-model.md) for the rest.
