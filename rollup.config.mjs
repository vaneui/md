import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

const plugins = () => [
  peerDepsExternal(),
  resolve({
    browser: true
  }),
  commonjs(),
  typescript({
    clean: true
  })
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
