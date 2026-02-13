const ACTION_ID_PREFIX = 'conn_mod_def::';

/**
 * Ensure action ID has the required prefix.
 */
export function normalizeActionId(id: string): string {
  if (id.startsWith(ACTION_ID_PREFIX)) return id;
  return `${ACTION_ID_PREFIX}${id}`;
}

/**
 * Extract {{variable}} names from a path string.
 */
export function extractPathVariables(path: string): string[] {
  const matches = path.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
}

/**
 * Replace {{variable}} placeholders in a path with provided values.
 */
export function replacePathVariables(
  path: string,
  vars: Record<string, string>
): string {
  let result = path;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{{${key}}}`, encodeURIComponent(value));
  }
  return result;
}

/**
 * Resolve path variables from data object and pathVars overrides.
 * Returns the resolved path and the remaining data (with used keys removed).
 */
export function resolveTemplateVariables(
  path: string,
  data: Record<string, unknown>,
  pathVars: Record<string, string>
): { resolvedPath: string; remainingData: Record<string, unknown> } {
  const variables = extractPathVariables(path);
  const merged: Record<string, string> = { ...pathVars };
  const remaining = { ...data };

  // Fill from data if not already provided in pathVars
  for (const v of variables) {
    if (!merged[v] && data[v] != null) {
      merged[v] = String(data[v]);
      delete remaining[v];
    }
  }

  return {
    resolvedPath: replacePathVariables(path, merged),
    remainingData: remaining,
  };
}
