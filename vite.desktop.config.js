import { readFileSync } from 'node:fs';
import { defineConfig, mergeConfig } from 'vite';
import webConfig from './vite.config.js';

// A configuração web e seus comandos continuam intactos. Só o Tauri usa esta.
export default mergeConfig(webConfig, defineConfig({
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    open: false,
  },
  plugins: [{
    name: 'geospt-desktop-report',
    configureServer(server) {
      server.middlewares.use('/desktop-report.html', (_request, response) => {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(readFileSync(new URL('./src-tauri/report.html', import.meta.url)));
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'desktop-report.html',
        source: readFileSync(new URL('./src-tauri/report.html', import.meta.url), 'utf8'),
      });
    },
  }],
}));
