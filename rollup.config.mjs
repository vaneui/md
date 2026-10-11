import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

/**
 * rollup-plugin-typescript2 writes a declaration file for every module under
 * src. Internal modules and the tests are not part of the public types, so
 * theirs are left out of dist (no public declaration imports them).
 */
const privateDeclarations = /^(?:include-paths|include-blocks|setupTests)\.d\.ts$|^tests\//;

const dropPrivateDeclarations = () => ({
  name: 'drop-private-declarations',
  generateBundle(_options, bundle) {
    for (const fileName of Object.keys(bundle)) {
      if (privateDeclarations.test(fileName)) delete bundle[fileName];
    }
  }
});

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

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        exports: 'named',
        sourcemap: true
      }
    ],
    plugins: plugins()
  },
  {
    input: 'src/yaml.ts',
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
    external: ['node:fs', 'node:fs/promises', 'node:path', 'fs', 'fs/promises', 'path'],
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
