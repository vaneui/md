import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

/**
 * rollup-plugin-typescript2 writes a declaration file for every module under
 * src. Internal modules and the tests are not part of the public types, so
 * theirs are left out of dist (no public declaration imports them).
 */
const privateDeclarations = /^(?:include-paths|include-blocks|trimNewlines|setupTests)\.d\.ts$|^tests\//;

const dropPrivateDeclarations = () => ({
  name: 'drop-private-declarations',
  generateBundle(_options, bundle) {
    for (const fileName of Object.keys(bundle)) {
      if (privateDeclarations.test(fileName)) delete bundle[fileName];
    }
  }
});

/**
 * Markdoc is a dependency, so the installed copy is the one that runs: it is
 * never bundled, and a consumer can update it on its own. The source reads it
 * only through its default export, because Node cannot import names from
 * Markdoc's CommonJS build (`scripts/check-dist.mjs` loads every entry).
 */
const external = ['@markdoc/markdoc'];

const plugins = () => [
  peerDepsExternal(),
  resolve({
    browser: true
  }),
  commonjs(),
  typescript({
    clean: true
  }),
  dropPrivateDeclarations()
];

// Only the client entry is a client boundary; the main entry and their shared chunk stay server-safe.
const clientBanner = (chunk) => (chunk.isEntry && chunk.name === 'client' ? '"use client";' : '');

export default [
  {
    // One build for both entries, so they share one chunk: one copy of the renderers and of the parse code.
    input: { index: 'src/index.ts', client: 'src/client.tsx' },
    external,
    output: [
      {
        dir: 'dist',
        format: 'cjs',
        exports: 'named',
        sourcemap: true,
        entryFileNames: '[name].cjs',
        chunkFileNames: 'shared-[hash].cjs',
        banner: clientBanner
      },
      {
        dir: 'dist',
        format: 'esm',
        exports: 'named',
        sourcemap: true,
        entryFileNames: '[name].esm.js',
        chunkFileNames: 'shared-[hash].esm.js',
        banner: clientBanner
      }
    ],
    plugins: plugins()
  },
  {
    input: 'src/yaml.ts',
    external,
    output: [
      {
        file: 'dist/yaml.cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
      },
      {
        file: 'dist/yaml.esm.js',
        format: 'esm',
        exports: 'named',
        sourcemap: true
      }
    ],
    plugins: plugins()
  },
  {
    input: 'src/registry.ts',
    external,
    output: [
      {
        file: 'dist/registry.cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
      },
      {
        file: 'dist/registry.esm.js',
        format: 'esm',
        exports: 'named',
        sourcemap: true
      }
    ],
    plugins: plugins()
  },
  {
    // Pure spec transforms (renderSpec / expandShorthand / collapseShorthand /
    // sanitizeSpecProps). No createContext, so this subpath is safe to import
    // from a React Server Component / server-only module.
    input: 'src/spec.ts',
    external,
    output: [
      {
        file: 'dist/spec.cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
      },
      {
        file: 'dist/spec.esm.js',
        format: 'esm',
        exports: 'named',
        sourcemap: true
      }
    ],
    plugins: plugins()
  },
  {
    // Node-only load-time include expansion. Node built-ins stay external so
    // the shared `resolve({ browser: true })` plugin never tries to shim them.
    input: 'src/include.ts',
    external: [...external, 'node:fs', 'node:fs/promises', 'node:path', 'fs', 'fs/promises', 'path'],
    output: [
      {
        file: 'dist/include.cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
      },
      {
        file: 'dist/include.esm.js',
        format: 'esm',
        exports: 'named',
        sourcemap: true
      }
    ],
    plugins: plugins()
  },
  {
    input: 'src/shiki.tsx',
    external,
    output: [
      {
        file: 'dist/shiki.cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
      },
      {
        file: 'dist/shiki.esm.js',
        format: 'esm',
        exports: 'named',
        sourcemap: true
      }
    ],
    plugins: plugins()
  },
  {
    input: 'src/prism.tsx',
    external,
    output: [
      {
        file: 'dist/prism.cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
      },
      {
        file: 'dist/prism.esm.js',
        format: 'esm',
        exports: 'named',
        sourcemap: true
      }
    ],
    plugins: plugins()
  }
];
