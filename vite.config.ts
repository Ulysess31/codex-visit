import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves this project below /codex-visit/; local Vite stays at /.
  base: mode === 'production' ? '/codex-visit/' : '/',
  plugins: [react()],
}))
