import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Only use electron plugin in build mode, not in dev (Docker can't run Electron)
    ...(process.env.NODE_ENV === 'production'
      ? [
          electron({
            main: {
              entry: 'src/main/index.ts',
              vite: {
                build: {
                  outDir: 'dist-electron',
                  rollupOptions: {
                    output: {
                      entryFileNames: 'index.js',
                    },
                  },
                },
              },
            },
            preload: {
              input: 'src/preload/index.ts',
              vite: {
                build: {
                  outDir: 'dist-electron',
                  rollupOptions: {
                    output: {
                      entryFileNames: 'preload.js',
                    },
                  },
                },
              },
            },
            renderer: {},
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      external: ['electron'],
    },
  },
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
    },
    host: true,
    strictPort: true,
    port: 5173,
  },
})
