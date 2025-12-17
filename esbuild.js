const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { polyfillNode } = require('esbuild-plugin-polyfill-node');

const production = process.argv.includes('--production') || process.argv.includes('--omit=dev');
const watch = process.argv.includes('--watch');
const outputDir = 'dist';

/**
 * @returns {import('esbuild').Plugin}
 */
function esbuildProblemMatcherPlugin(deleteOutput = false) {
  return {
    name: 'esbuild-problem-matcher',

    setup(build) {
      build.onStart(() => {
        console.log('[watch] build started');
        if (!deleteOutput) return;

        // clean output dist
        const deletedDir = path.join(__dirname, outputDir);
        fs.rmSync(deletedDir, { recursive: true, force: true });
      });
      build.onEnd((result) => {
        result.errors.forEach(({ text, location }) => {
          console.error(`✘ [ERROR] ${text}`);
          console.error(`    ${location.file}:${location.line}:${location.column}:`);
        });
        console.log('[watch] build finished');
      });
    },
  };
}

/**
 * @returns {import('esbuild').Plugin}
 */
function replaceStringsPlugin(options) {
  return {
    name: 'replace-strings',
    setup(build) {
      build.onLoad({ filter: /.*\.ts/ }, async (args) => {
        let contents = await fs.promises.readFile(args.path, 'utf8');
        for (const [search, replace] of Object.entries(options)) {
          contents = contents.replace(new RegExp(search, 'g'), replace);
        }
        return { contents, loader: 'default' };
      });
    },
  };
}

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/index.ts'],
    bundle: true,
    format: 'iife',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    sourceRoot: '../src',
    platform: 'browser',
    globalName: 'TikZJax',
    outbase: 'src',
    outdir: outputDir,
    allowOverwrite: true,
    external: ['dom'],
    logLevel: 'silent',
    tsconfig: 'tsconfig.browser.json',
    plugins: [
      replaceStringsPlugin({
        './loader': './browser/loader',
      }),
      polyfillNode(),
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin(true),
    ],
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
  const tikzWorker = await esbuild.context({
    entryPoints: ['src/tikz-worker.ts'],
    bundle: true,
    format: 'iife',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    sourceRoot: '../src',
    platform: 'browser',
    outbase: 'src',
    outdir: outputDir,
    allowOverwrite: true,
    external: ['dom'],
    logLevel: 'silent',
    plugins: [
      replaceStringsPlugin({
        './loader': './browser/loader',
      }),
      polyfillNode(),
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin(),
    ],
  });
  await tikzWorker.rebuild();
  await tikzWorker.dispose();

  const ctxWorker = await esbuild.context({
    entryPoints: ['src/worker.ts'],
    bundle: true,
    format: 'iife',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    sourceRoot: '../src',
    platform: 'browser',
    globalName: 'TikZWorker',
    outbase: 'src',
    outdir: outputDir,
    allowOverwrite: true,
    external: ['dom'],
    logLevel: 'silent',
    plugins: [
      polyfillNode(),
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin(),
    ],
  });
  await ctxWorker.rebuild();
  await ctxWorker.dispose();

  const cjs = await esbuild.context({
    entryPoints: ['src/index.ts', 'src/tikz-worker.ts', 'src/worker.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    sourceRoot: '../src',
    platform: 'node',
    outbase: 'src',
    outdir: outputDir,
    allowOverwrite: true,
    external: [
      'dom',
      'os',
      'crypto',
      'fs',
      'url',
      'path',
      'stream',
      'zlib',
      '@prinsss/dvi2html',
      'memfs',
      'pako',
      'tar-fs',
      'threads',
    ],
    logLevel: 'silent',
    outExtension: { '.js': '.cjs' },
    plugins: [
      replaceStringsPlugin({
        'worker.js': 'worker.cjs',
      }),
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin(),
    ],
  });
  await cjs.rebuild();
  await cjs.dispose();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
