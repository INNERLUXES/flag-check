# 1. Every flag has an owner and a removal date

## Context

Release flags are meant to live only until a feature is on for everyone. In practice they stay, because removing one is nobody's task once the feature works. Each forgotten flag keeps two code paths alive, and the one that is switched off is no longer tested.

## Decision

The tool asks every flag for an owner and a removal date in its metadata. A missing value is a warning, so a team can adopt the tool on an old flag file without failing every build. A date that has passed is a problem, because it is the team's own date and the flag is now overdue.

## Consequences

Long-lived flags that are meant to stay, such as permission flags that switch a module on per plan, get a far removal date and are reviewed when it comes. The keys default to `owner` and `expires` and can be renamed.
