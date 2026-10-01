# Secure defaults

- **Read only.** Nothing is written unless `--output` names a file.
- **No network.** The tool never contacts a flag service or anything else; the flag file is the only source of truth it uses.
- **No dependencies.** Node 22 or newer and nothing else, so there is no third-party code to trust.
- **Fails closed in a pipeline.** Any problem gives exit code 1; a usage or input error gives exit code 2, never 0.
- **Repeatable.** `--today` fixes the date the removal dates are compared with, so the same input gives the same report.
- **Safe reports.** CSV cells cannot run as formulas, and Markdown tables cannot be broken by a key or message.
