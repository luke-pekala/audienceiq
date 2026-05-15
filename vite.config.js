import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:      'index.html',
        about:     'src/pages/about.html',
        privacy:   'src/pages/privacy.html',
        changelog: 'src/pages/changelog.html',
      }
    }
  }
})
