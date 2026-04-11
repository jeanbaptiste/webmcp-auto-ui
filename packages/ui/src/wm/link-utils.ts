/**
 * Utility functions for widget link visual indicators.
 *
 * groupColor() derives a deterministic HSL color from a groupId string,
 * so all widgets in the same link group share the same accent color.
 */

/** Derive a deterministic HSL color from a group ID string. */
export function groupColor(groupId: string): string {
  let hash = 0;
  for (const c of groupId) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffff;
  return `hsl(${hash % 360}, 60%, 50%)`;
}
