# Limits

The tool reads a flag file and source text. It does not run the product and does not ask the flag service anything, so some things are out of its sight.

- **Keys built at run time.** `getBooleanValue('checkout-' + region, false)` is not seen, so a flag used only that way is reported as `unused`, and an evaluated key that is built this way is never reported as `undefined`. Keep flag keys as whole string literals, or accept the warning.
- **SDK styles it does not read.** The Go SDK passes a context first (`client.BooleanValue(ctx, "key", ...)`), and some wrappers hide the call behind a helper of your own. Those calls still count as uses when the key appears as a quoted string, but an undefined key in them is not reported.
- **Targeting logic.** The JsonLogic in `targeting` is not evaluated. A rule that always returns the same variant is not recognised as "fully on".
- **Flags defined somewhere else.** Only the one file is read. If flags come from several files or from a flag service, merge them into one file for the check, or run the tool once per file.
- **Strings that only look like keys.** A flag key that is also an ordinary word in the code (`'search'`) counts as used wherever that string appears. Keys with a prefix or a dash, such as `new-billing-page`, avoid this.
- **Very large files.** Source files over 2 MB are skipped and listed in the report, so a generated bundle does not slow the scan down.
