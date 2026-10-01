# Contributing

Every change goes through a pull request and is reviewed before it is merged. The pipeline runs the tests on Linux, Windows and macOS, the repository checks, CodeQL, and a secure development check of the repository itself.

## Adding or changing a check

1. Describe the check in docs/checks.md first: what it looks for, its level, and why it matters.
2. Add a test with a small, made-up flag file where the expected findings can be worked out by hand.
3. Anything the tool cannot see goes into docs/limits.md, never silently ignored.

## Rules for the code

- No runtime dependencies. Node 22 or newer and nothing else.
- The tool reads the files it is given and writes only when `--output` is given. It opens no network connection and never talks to a flag service.
- Never commit the flag file of a real product, even as a test fixture.

## Before you open the pull request

```
npm test
npm run check
npm run example
```
