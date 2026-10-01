// Reads a flagd flag definition file (https://flagd.dev/reference/flag-definitions/).
// The file is JSON with a "flags" object, optional "$evaluators" and optional flag-set "metadata".
// Flag metadata is merged over the flag-set metadata, as flagd does when it resolves a flag.

const STATES = new Set(['ENABLED', 'DISABLED']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// The JSON type of a variant value, so variants of different types can be reported.
export function valueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

// Parses the text of a flag file. Throws an Error with a readable message when the file is not usable at all;
// problems inside single flags are kept on the flag and reported by the checks.
export function parseFlagFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`not valid JSON: ${error.message}`);
  }
  if (!isObject(data)) throw new Error('the file must hold a JSON object');
  if (!isObject(data.flags)) throw new Error('the file has no "flags" object');

  const setMetadata = isObject(data.metadata) ? data.metadata : {};
  const evaluators = isObject(data.$evaluators) ? data.$evaluators : {};
  const flags = Object.keys(data.flags).sort().map((key) => {
    const raw = data.flags[key];
    const flag = isObject(raw) ? raw : {};
    const own = isObject(flag.metadata) ? flag.metadata : {};
    return {
      key,
      valid: isObject(raw),
      state: flag.state,
      variants: isObject(flag.variants) ? flag.variants : null,
      hasDefaultVariant: Object.prototype.hasOwnProperty.call(flag, 'defaultVariant'),
      defaultVariant: flag.defaultVariant,
      targeting: flag.targeting,
      metadata: { ...setMetadata, ...own }
    };
  });
  return { flags, evaluators, setMetadata };
}

// True when a flag has targeting rules that can change the result for some users.
export function hasTargeting(flag) {
  const t = flag.targeting;
  if (t === undefined || t === null) return false;
  if (isObject(t) && Object.keys(t).length === 0) return false;
  return true;
}

// Names of shared evaluators that a flag's targeting points to with {"$ref": "name"}.
export function evaluatorRefs(targeting) {
  const found = [];
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!isObject(node)) return;
    if (typeof node.$ref === 'string') found.push(node.$ref);
    for (const value of Object.values(node)) visit(value);
  };
  visit(targeting);
  return found;
}

export { STATES };
