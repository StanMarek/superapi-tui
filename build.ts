import { build } from 'bun'
import pkg from './package.json'

await build({
  entrypoints: ['src/cli.tsx'],
  outdir: 'dist',
  target: 'node',
  define: {
    '__APP_VERSION__': JSON.stringify(pkg.version),
  },
  plugins: [
    {
      name: 'ignore-react-devtools',
      setup(build) {
        build.onResolve({ filter: /react-devtools-core/ }, () => ({
          path: 'react-devtools-core',
          namespace: 'ignore',
        }))
        build.onLoad({ filter: /.*/, namespace: 'ignore' }, () => ({
          contents: 'export default {}',
          loader: 'js',
        }))
      },
    },
  ],
})
