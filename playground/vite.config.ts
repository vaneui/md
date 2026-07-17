import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  resolve: {
    // Array form: the /styles subpath must be matched before the bare package.
    alias: [
      { find: '@vaneui/md/styles', replacement: path.resolve(__dirname, '../src/styles/index.css') },
      { find: '@vaneui/md', replacement: path.resolve(__dirname, '../src/index.ts') },
    ]
  },
  server: {
    port: 3000,
    open: true,
    host: true,
    strictPort: false
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  process.exit(0);
});