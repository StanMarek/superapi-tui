import { build } from 'bun'

await build({
  entrypoints: ['src/cli.tsx'],
  outdir: 'dist',
  target: 'node',
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
