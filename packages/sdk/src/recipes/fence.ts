/**
 * Pick a backtick fence longer than any run of backticks inside `content`.
 * CommonMark rule: a fenced code block opens with N≥3 backticks; the content
 * must not contain a closing fence of the same length, and the closing fence
 * must be at least as long as the opening. Choosing N = max(3, longestRun+1)
 * makes round-trips safe even when the cell content embeds Markdown fences.
 */
export function pickFence(content: string): string {
  const runs = content.match(/`+/g) ?? [];
  const longest = runs.reduce((m, r) => Math.max(m, r.length), 0);
  return '`'.repeat(Math.max(3, longest + 1));
}
