/**
 * @license
 * SITEFLOW Firestore Data Sanitizer
 * Recursively strips `undefined` properties so that mutations
 * never fail with "Unsupported field value: undefined".
 */

export function stripUndefined<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== undefined) {
      result[k] = stripUndefined(v);
    }
  }
  return result as T;
}
