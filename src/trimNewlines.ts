/**
 * `code` without the line breaks at its end.
 *
 * A loop instead of a `\n+$` pattern: the pattern is tried again from every
 * line break of a long run that is not at the end, which takes quadratic time
 * (seconds for a code block with tens of thousands of blank lines).
 */
export function trimTrailingNewlines(code: string): string {
  let end = code.length;
  while (end > 0 && code.charCodeAt(end - 1) === 10) end--;
  return end === code.length ? code : code.slice(0, end);
}
