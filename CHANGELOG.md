# Changes

## 1.0.0

First release.

- Reads a flagd (OpenFeature) flag definition file, with flag metadata merged over flag-set metadata.
- Ten checks: state, variants, defaultVariant, evaluator references, owner, removal date, fully on, switched off, and with `--src` unused flags and evaluated keys that are not defined.
- Source scan for OpenFeature evaluation calls in the JavaScript, TypeScript, Java, .NET and Python SDK styles.
- Reports as text, Markdown, JSON and CSV; `--fail-on problem|warning` for use in a pipeline.
- Release packages come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation.
