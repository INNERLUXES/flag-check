# Checks

A **problem** means the flag file is wrong or a flag has outlived the date the team set for it. A **warning** means a flag that is probably debt. `--fail-on warning` makes warnings fail a pipeline too.

| Check | Level | What it looks for | Why it matters |
| --- | --- | --- | --- |
| `state` | problem | `state` is `ENABLED` or `DISABLED`, and the flag is an object | flagd refuses or misreads anything else |
| `variants` | problem | at least one variant, all of one JSON type | flagd requires one type; a mix makes the code read the wrong value |
| `default-variant` | problem | `defaultVariant`, when it is a string, names a variant | the flag would not resolve to a value |
| `evaluator` | problem | every `{"$ref": "name"}` in the targeting names an entry in `$evaluators` | the targeting rule cannot be built |
| `owner` | warning | an owner in the flag or flag-set metadata | a flag without an owner is never removed |
| `removal-date` | warning, or problem | a removal date: missing is a warning; not `YYYY-MM-DD` or already passed is a problem | the date is the team's own promise to remove the flag |
| `fully-on` | warning | an enabled boolean flag whose default is `true` and that has no targeting | the feature is on for everyone; the flag and the old code path can go |
| `switched-off` | warning | a disabled flag | either the feature was dropped and its code should go, or it should be switched back on |
| `unused` | warning, with `--src` | the flag key never appears as a quoted string in the scanned source | the flag does nothing, or the code builds the key at run time (see docs/limits.md) |
| `undefined` | problem, with `--src` | a key the code passes to an OpenFeature evaluation call that the flag file does not define | the code always gets its built-in default, which is rarely what was meant |

## Metadata

Flag metadata is merged over the flag-set metadata, with the flag winning, as flagd does when it resolves a flag. The keys are `owner` and `expires` unless `--owner-key` and `--removal-key` name others.

## Evaluation calls the source scan reads

The first argument, when it is a quoted string, of:

- `getBooleanValue`, `getStringValue`, `getNumberValue`, `getIntegerValue`, `getDoubleValue`, `getObjectValue` and the `...Details` forms (JavaScript, TypeScript, Java, Kotlin, PHP);
- the same names with a capital letter and `Async` (.NET);
- `get_boolean_value`, `get_string_value`, `get_integer_value`, `get_float_value`, `get_object_value` and the `..._details` forms (Python).
