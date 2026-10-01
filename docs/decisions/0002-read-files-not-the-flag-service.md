# 2. Read files, not the flag service

## Context

Flag services have APIs that would give the live state of every flag. Calling them needs credentials, network access from the build, and code for each vendor.

## Decision

The tool reads the flagd flag file that lives in the repository, next to the code that uses it. It never connects to a flag service.

## Consequences

The check runs anywhere, with no secret, and gives the same answer for the same commit. Teams whose flags live only in a hosted service export them to a flagd file for the check; the OpenFeature standard keeps that format vendor-neutral.
