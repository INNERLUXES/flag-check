# flag-check

Checks the feature flags of a SaaS product before they turn into hidden code paths nobody tests.

Feature flags let a change reach a few customers first and be switched off at once if something goes wrong. Each flag is meant to be temporary, but flags are easy to add and easy to forget: the one switched on for everyone months ago, the one switched off for good, the one nobody owns. This tool reads a [flagd](https://flagd.dev/reference/flag-definitions/) flag file, the format used by the [OpenFeature](https://openfeature.dev/) flag daemon, and answers:

- Which flags are broken: a wrong `state`, variants of mixed types, a `defaultVariant` that is not a variant, targeting that refers to an evaluator that does not exist?
- Which flags have no owner, no removal date, or a removal date that has passed?
- Which boolean flags are on for everyone with no targeting, so the flag and the old code path can go?
- Which flags are switched off?
- With `--src`: which flags are never used in the code, and which keys does the code evaluate that the flag file does not define?

Plain JavaScript, no dependencies. It reads the files you give it, opens no network connection, and never talks to a flag service.

```
npm test
```

```
ℹ tests 24
ℹ pass 24
ℹ fail 0
```

## Quick start

Requires Node 22 or newer. There is nothing to install.

```
git clone https://github.com/INNERLUXES/flag-check.git
cd flag-check
node bin/flag-check.js examples/flags.json --src examples/app --today 2030-01-01
```

```
flag-check: examples/flags.json
source: 2 file(s) scanned

PROBLEM  chat-assistant  [variants]  variants mix types: boolean, string
PROBLEM  chat-assistant  [removal-date]  "expires" is "soon", expected a date as YYYY-MM-DD
PROBLEM  report-export  [evaluator]  targeting refers to evaluator "enterprise-plans", which is not defined
PROBLEM  report-export  [removal-date]  removal date 2020-01-31 has passed
PROBLEM  search-suggestions  [undefined]  evaluated in examples/app/search.py:9 but not defined in the flag file
warning  chat-assistant  [unused]  not found in the scanned source code
warning  faster-search  [fully-on]  on for everyone with no targeting: remove the flag and the old code path
warning  old-dashboard  [switched-off]  disabled: remove it with its code, or switch it back on
warning  old-dashboard  [unused]  not found in the scanned source code

5 flag(s), 5 problem(s), 4 warning(s)
```

## Owner and removal date

The tool reads both from the flag's `metadata`, merged over the flag-set `metadata` the way flagd merges them, so a team can set one owner for the whole file and override it per flag:

```json
{
  "metadata": { "owner": "platform-team" },
  "flags": {
    "new-billing-page": {
      "state": "ENABLED",
      "variants": { "on": true, "off": false },
      "defaultVariant": "off",
      "targeting": { "if": [{ "$ref": "beta-customers" }, "on", "off"] },
      "metadata": { "owner": "billing-team", "expires": "2099-12-31" }
    }
  }
}
```

The keys are `owner` and `expires` by default; use `--owner-key` and `--removal-key` if your team calls them something else. Dates are `YYYY-MM-DD` and are compared with today in UTC, or with `--today` for a repeatable run.

## Options

```
--src <path>          also scan source code (repeatable)
--owner-key <name>    metadata key that names the owner (default: owner)
--removal-key <name>  metadata key that holds the removal date (default: expires)
--today <YYYY-MM-DD>  the day to compare removal dates with (default: today, UTC)
--format <name>       text, markdown, json or csv
--output <file>       write the report to a file
--fail-on <level>     problem (default) or warning
```

Exit codes: `0` nothing at or above `--fail-on`, `1` findings at or above it, `2` a usage or input error.

## In a pipeline

```yaml
- name: Feature flag check
  run: node flag-check/bin/flag-check.js flags/flags.json --src src --format markdown >> "$GITHUB_STEP_SUMMARY"
```

## What it checks, and what it cannot see

- [docs/checks.md](docs/checks.md): every check, its level, and why it matters.
- [docs/limits.md](docs/limits.md): what a file and text check cannot see, such as a flag key built at run time.
- [docs/threat-model.md](docs/threat-model.md) and [docs/secure-defaults.md](docs/secure-defaults.md).
- [docs/decisions](docs/decisions): why the tool works the way it does.

## Background

- Martin Fowler, [Feature Toggles (aka Feature Flags)](https://martinfowler.com/articles/feature-toggles.html): the kinds of flags and the cost each one carries.
- [OpenFeature](https://openfeature.dev/): the open, vendor-neutral standard for feature flagging.
- How enhancements reach the customers of a live SaaS product: [SaaS product enhancement services](https://innerluxes.dev/software-development/saas/enhancement).

## License

MIT
