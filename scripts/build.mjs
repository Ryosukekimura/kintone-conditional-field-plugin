// src/ の TypeScript を kintone が読み込める 1 ファイルずつの JS にまとめる
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: {
    desktop: 'src/desktop/index.ts',
    config: 'src/config/index.tsx',
  },
  outdir: 'plugin/js',
  bundle: true,
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  define: { 'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production') },
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
