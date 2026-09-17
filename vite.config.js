import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

// The plugin is loaded as a plain script tag in Origo and exposes the global
// `Lmsearch`. Origo itself is provided by the host page as the global `Origo`,
// so it is kept external instead of being bundled.
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const isAnalyze = mode === 'analyze';

  return {
    build: {
      // Dev builds are written straight into the sibling Origo checkout,
      // the same place the sass watcher writes lmsearch.css.
      outDir: isDev ? '../origo/plugins' : 'build/js',
      emptyOutDir: false,
      target: 'es2017',
      minify: !isDev,
      sourcemap: isDev,
      lib: {
        entry: 'lmsearch.js',
        name: 'Lmsearch',
        formats: ['iife'],
        fileName: () => (isDev ? 'lmsearch.js' : 'lmsearch.min.js')
      },
      rollupOptions: {
        external: ['Origo'],
        output: {
          globals: {
            Origo: 'Origo'
          },
          extend: false
        }
      }
    },
    plugins: isAnalyze ? [visualizer({
      filename: 'build/bundle-stats.html',
      gzipSize: true,
      open: true
    })] : []
  };
});
