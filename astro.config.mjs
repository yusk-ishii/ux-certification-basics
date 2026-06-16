// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://yusk-ishii.github.io',
  base: '/ux-certification-basics',
  vite: {
    plugins: [tailwindcss()]
  }
});