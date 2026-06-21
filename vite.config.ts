import { defineConfig } from 'vite';

// Statisch deploy-ready: relative Asset-Pfade (base './') -> funktioniert
// unter beliebigem Pfad (Vercel/Unterordner). Build-Output nach dist/.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
  },
  server: {
    host: true,
  },
});
