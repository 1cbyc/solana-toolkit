import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/solana-toolkit.esm.js',
      format: 'esm',
      sourcemap: true
    },
    {
      file: 'dist/solana-toolkit.cjs.js',
      format: 'cjs',
      sourcemap: true
    },
    {
      file: 'dist/solana-toolkit.min.js',
      format: 'umd',
      name: 'SolanaToolkit',
      sourcemap: true,
      plugins: [terser()]
    }
  ],
  external: [
    '@solana/web3.js',
    '@solana/spl-token',
    'bs58',
    'tweetnacl',
    'tweetnacl-util'
  ],
  plugins: [
    nodeResolve(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**'
    })
  ]
}; 