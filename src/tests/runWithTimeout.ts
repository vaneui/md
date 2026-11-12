import vm from 'node:vm';

/**
 * Runs `fn` synchronously and throws once it has run for `ms` milliseconds.
 * Jest's own timeout cannot stop synchronous code, so an endless loop would
 * hang the whole run; under the `vm` watchdog it fails the one test instead.
 */
export function runWithTimeout<T>(fn: () => T, ms = 5000): T {
  return vm.runInNewContext('fn()', { fn }, { timeout: ms }) as T;
}
