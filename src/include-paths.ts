/**
 * Path rules for `@vaneui/md/include`, kept apart from the module that reads
 * files so they can be unit-tested with `path.win32` on any platform. Internal:
 * nothing here is exported from a package entry.
 */

/** The part of Node's `path` module (`path.posix` or `path.win32`) these helpers use. */
export interface PathModule {
  readonly sep: string;
  resolve(...paths: string[]): string;
  join(...paths: string[]): string;
  relative(from: string, to: string): string;
  dirname(path: string): string;
  isAbsolute(path: string): boolean;
}

/**
 * Absolute path of an include target. A leading `/` or `\` resolves from
 * `root` (so on Windows it never jumps to the drive root); anything else
 * resolves against the directory of `from`, the file containing the tag.
 */
export function resolveIncludePath(p: PathModule, root: string, from: string, target: string): string {
  return target.startsWith("/") || target.startsWith("\\")
    ? p.join(root, target)
    : p.resolve(p.dirname(from), target);
}

/**
 * Whether `file` is `root` or below it. Both must be absolute. With `path.win32`
 * the comparison ignores case, and a path on another drive is outside.
 */
export function isInside(p: PathModule, root: string, file: string): boolean {
  const relative = p.relative(root, file);
  return relative !== ".." && !relative.startsWith(".." + p.sep) && !p.isAbsolute(relative);
}
