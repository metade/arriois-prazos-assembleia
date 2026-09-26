import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// Relative assets work at both the GitHub Pages repository path and the custom domain.
export default defineConfig({ base: './', plugins: [tailwindcss()] })
