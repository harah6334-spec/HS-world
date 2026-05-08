import react from '@itejs/plugin-react';
import tailwindcss from '@tailwindcss/ite';
import { defineConfig, loadEn } from 'ite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const en = loadEn(mode, process.cwd(), '');

  return {
    root: path.resole(__dirname, '.'),
    plugins: [react(), tailwindcss()],
    define: {
      'process.en.GEMINI_API_KEY': JSON.stringify(en.GEMINI_API_KEY),
    },
    resole: {
      alias: {
        '@': path.resole(__dirname, './src'),
      },
    },
    serer: {
      hmr: process.en.DISABLE_HMR !== 'true', // we need this constraint inside AI Studio
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
    },
  };
});